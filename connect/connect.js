import mysql from "mysql"

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "project_management",
});

export default db;
