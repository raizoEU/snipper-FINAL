require("dotenv").config();
const express = require("express");
const flash = require("connect-flash");
const passport = require("passport");
const session = require("express-session");
const initDb = require("./lib/initDb");
const router = require("./routes/routes");
const apiRouter = require("./routes/api");

const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.isAuthenticated() ? req.user : null;
  res.locals.successMessages = req.flash("success");
  res.locals.errorMessages = req.flash("error");
  next();
});

initDb();
require("./lib/passportConfig");

app.use("/", router);
app.use("/api", apiRouter);

const SERVER_PORT = process.env.SERVER_PORT || 8080;
app.listen(SERVER_PORT, () =>
  console.log(`Server is listening on port ${SERVER_PORT}`)
);

process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  app.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
