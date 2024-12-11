require("dotenv").config();
const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

(async () => {
  try {
    console.log("Connecting to MySQL database for initialization...");
    await db.getConnection();
    console.log("Connected to MySQL database for initialization");

    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `;

    const createSnippetsTableQuery = `
      CREATE TABLE IF NOT EXISTS snippets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        language VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `;

    await db.query(createUsersTableQuery);
    console.log("Users table created or already exists");

    await db.query(createSnippetsTableQuery);
    console.log("Snippets table created or already exists");
  } catch (err) {
    console.error("Error during database initialization:", err);
  } finally {
    db.end();
  }
})();

module.exports = () => db;