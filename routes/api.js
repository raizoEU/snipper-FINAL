const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const axios = require("axios");
const db = require("../lib/db");
const { createAccount } = require("../lib/register");
const { body, validationResult } = require("express-validator");

const router = express.Router();

router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, confirmPassword } = req.body;

    try {
      await createAccount(username, password, confirmPassword);
      res
        .status(201)
        .json({ message: "Registration successful! Please log in." });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post("/login", async (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: "Login successful" });
    });
  })(req, res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "You have been logged out." });
  });
});

router.post(
  "/search-results",
  [body("query").notEmpty().withMessage("Search query is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { query } = req.body;

    try {
      const [rows] = await db.execute(
        `SELECT snippets.*, users.username FROM snippets
       LEFT JOIN users ON snippets.user_id = users.id
       WHERE snippets.title LIKE ?`,
        [`%${query}%`]
      );

      res.status(200).json({ snippets: rows });
    } catch (error) {
      console.error("Error searching snippets:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.post(
  "/submit-snippet",
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("code").notEmpty().withMessage("Code is required"),
    body("language").notEmpty().withMessage("Language is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, code, description, language } = req.body;

    try {
      const userId = req.user ? req.user.id : null;

      const [result] = await db.query(
        "INSERT INTO snippets (title, code, description, language, user_id) VALUES (?, ?, ?, ?, ?)",
        [title, code, description, language, userId]
      );

      const snippetId = result.insertId;

      res.status(201).json({
        message: "Snippet created successfully!",
        snippetId,
      });
    } catch (error) {
      console.error("Error submitting snippet:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.get("/snippet/:id", async (req, res) => {
  const snippetId = req.params.id;

  try {
    const [rows] = await db.execute(
      `SELECT snippets.*, users.username FROM snippets 
       LEFT JOIN users ON snippets.user_id = users.id 
       WHERE snippets.id = ?`,
      [snippetId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    const snippet = rows[0];
    res.status(200).json({ snippet });
  } catch (err) {
    console.error("Error fetching snippet:", err);
    res.status(500).json({ error: "Error fetching snippet" });
  }
});

router.put(
  "/snippet/:id",
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("code").notEmpty().withMessage("Code is required"),
    body("language").notEmpty().withMessage("Language is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const snippetId = req.params.id;
    const { title, code, description, language } = req.body;

    try {
      const [result] = await db.execute(
        `UPDATE snippets SET title = ?, code = ?, description = ?, language = ? WHERE id = ?`,
        [title, code, description, language, snippetId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Snippet not found" });
      }

      res.status(200).json({ message: "Snippet updated successfully!" });
    } catch (error) {
      console.error("Error updating snippet:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.delete("/snippet/:id", async (req, res) => {
  const snippetId = req.params.id;

  try {
    const [result] = await db.execute(`DELETE FROM snippets WHERE id = ?`, [
      snippetId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    res.status(200).json({ message: "Snippet deleted successfully!" });
  } catch (error) {
    console.error("Error deleting snippet:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
