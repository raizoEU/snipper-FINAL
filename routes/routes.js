const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const axios = require("axios");
const { check, validationResult } = require("express-validator");
const db = require("../lib/db");
const { createAccount } = require("../lib/register");

const router = express.Router();

router.get("/", async (req, res) => {
  const response = await axios.get(
    "https://programming-quotesapi.vercel.app/api/random"
  );
  const quote = response.data;
  console.log(quote);

  res.render("layout/layout", {
    pageContent: "../pages/index",
    quote,
  });
});

router.get("/about", (req, res) => {
  res.render("layout/layout", {
    pageContent: "../pages/about",
  });
});

router.get("/register", (req, res) => {
  res.render("layout/layout", {
    pageContent: "../pages/register",
  });
});

router.post(
  "/register",
  [
    check("username").not().isEmpty().withMessage("Username is required"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    check("confirmPassword")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords must match"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, confirmPassword } = req.body;

    try {
      await createAccount(username, password, confirmPassword);

      req.flash("success", "Registration successful! Please log in.");
      res.redirect("/login");
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(400).send(error.message);
    }
  }
);

router.get("/login", (req, res) => {
  res.render("layout/layout", {
    pageContent: "../pages/login",
  });
});

router.post(
  "/login",
  [
    check("username").not().isEmpty().withMessage("Username is required"),
    check("password").not().isEmpty().withMessage("Password is required"),
  ],
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have been logged out.");
    res.redirect("/");
  });
});

router.get("/search", (req, res) => {
  res.render("layout/layout", {
    pageContent: "../pages/search",
    query: "",
    snippets: [],
  });
});

router.post(
  "/search-results",
  [
    check("query")
      .not()
      .isEmpty()
      .withMessage("Search query is required")
      .trim()
      .escape(),
  ],
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

      res.render("layout/layout", {
        pageContent: "../pages/search",
        snippets: rows,
        query,
      });
    } catch (error) {
      console.error("Error searching snippets:", error);
      res.status(500).send("Server error");
    }
  }
);

router.get("/snippets", async (req, res) => {
  try {
    const [snippets] = await db.query(
      "SELECT s.*, u.username FROM snippets s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC"
    );
    res.render("layout/layout", {
      pageContent: "../pages/snippets",
      snippets,
    });
  } catch (error) {
    console.error("Error fetching snippets:", error);
    res.status(500).send("Server error");
  }
});

router.post(
  "/submit-snippet",
  [
    check("title").not().isEmpty().withMessage("Title is required"),
    check("code").not().isEmpty().withMessage("Code is required"),
    check("language").not().isEmpty().withMessage("Language is required"),
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

      req.flash("success", "Snippet created successfully!");
      res.redirect(`/snippet/${snippetId}`);
    } catch (error) {
      console.error("Error submitting snippet:", error);
      res.status(500).send("Server error");
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
      return res.status(404).send("Snippet not found");
    }

    const snippet = rows[0];
    console.log(snippet);

    res.render("layout/layout", {
      pageContent: "../pages/snippet",
      snippet,
    });
  } catch (err) {
    console.error("Error fetching snippet:", err);
    res.status(500).send("Error fetching snippet");
  }
});

module.exports = router;
