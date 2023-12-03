const express = require("express");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const databasePath = path.join(__dirname, "userData.db");
let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running At: http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
  }
};

initializeDBAndServer();

app.post("/users/", async (request, response) => {
  const { username, password, name, gender, location } = request.body;
  const encryptedPassword = await bcrypt.hash(password, 10);

  const userCheckingQuery = `SELECT * FROM user WHERE username='${username}';`;
  const dbUser = await database.get(userCheckingQuery);

  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createNewUser = `INSERT INTO user(username,password,name,gender,location) 
        VALUES ('${username}','${encryptedPassword}','${name}','${gender}','${location}');`;
      await database.run(createNewUser);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//USER LOGIN

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserIdentity = `SELECT * FROM user WHERE username='${username}';`;
  const dbUserResponse = await database.get(checkUserIdentity);
  if (dbUserResponse === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const checkPasswordIsMatched = await bcrypt.compare(
      password,
      dbUserResponse.password
    );
    if (checkPasswordIsMatched) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//CHANGE PASSWORD

app.put("/change-password/", async (request, response) => {
  const { username, password, newPassword } = request.body;
  const checkUserNameQuery = `SELECT * FROM user WHERE username='${username}';`;
  const dbResponse = await database.get(checkUserNameQuery);
  if (dbResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      dbResponse.password
    );
    if (isPasswordMatched === true) {
      const checkNewPasswordLength = newPassword.length > 5;
      if (checkNewPasswordLength === true) {
        const encryptedNewPassword = await bcrypt.hash(newPassword, 10);
        const newPasswordQuery = `UPDATE user SET password ='${encryptedNewPassword}' WHERE username='${username}';`;
        await database.run(newPasswordQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
