const db = require("./db");
const bcrypt = require("bcrypt");

async function createAccount(username, password, confirmPassword) {
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [
    username,
  ]);
  if (rows.length > 0) {
    throw new Error("Username already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
    username,
    hashedPassword,
  ]);
}

module.exports = {
  createAccount,
};
