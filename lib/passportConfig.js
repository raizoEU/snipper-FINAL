const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const db = require("./db");

(async () => {
  try {
    const [rows] = await db.query("SELECT 1");
    console.log("Connected database for Passport", rows);
  } catch (error) {
    console.error("Database error for Passport:", error);
  }
})();

passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const [rows] = await db.query(
          "SELECT * FROM users WHERE username = ?",
          [username]
        );

        if (rows.length === 0) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await bcrypt.compare(password, rows[0].password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, rows[0]);
      } catch (err) {
        console.error("Database query error:", err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    if (rows.length === 0) {
      return done(new Error("User not found"));
    }
    done(null, rows[0]);
  } catch (err) {
    console.error("Database query error:", err);
    done(err);
  }
});
