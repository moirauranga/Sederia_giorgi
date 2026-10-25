// Conexión a MySQL
const mysql = require("mysql2/promise");

// El "pool" mantiene varias conexiones abiertas y las reutiliza
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sederia_georgi"
});

module.exports = pool;
