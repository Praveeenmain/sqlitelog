const express = require("express");
const path = require("path");
const cors = require('cors');
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt=require("bcrypt")
const app = express();
const jwt=require("jsonwebtoken");
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "courier.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3009, () => {
      console.log("Server Running at http://localhost:3400/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();
const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
            request.username=payload.username;
          next();
        }
      });
    }
  };

app.get("/profile/",authenticateToken,async(request,response)=>{
    let {username}=request;
    
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(selectUserQuery);
  response.send(userDetails);
})
app.post("/users/", async (request, response) => {
    const { username, name, password, location } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
        INSERT INTO 
          user (username, name, password, location) 
        VALUES 
          (
            '${username}', 
            '${name}',
            '${hashedPassword}', 
           
            '${location}'
          )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`Created new user with ${newUserId}`);
    } else {
      response.status = 400;
      response.send("User already exists");
    }
  });
app.post("/login", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
         const payload={username:username};
         const jwtToken=jwt.sign(payload,"Tracking")
        response.send({jwtToken});
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  });



  


  