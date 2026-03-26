/**
 * index.js
 * This is your main app entry point
 */

// Set up express, bodyparser and EJS
const express = require("express");
const app = express();
const port = 3000;
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs"); // set the app to use ejs for rendering
app.use(express.static(__dirname + "/public")); // set location of static files

// Set up session management
const session = require("express-session");
app.use(
  session({
    secret: "sql-project-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Set up SQLite
// Items in the global namespace are accessible throught out the node application
const sqlite3 = require("sqlite3").verbose();
global.db = new sqlite3.Database("./database.db", function (err) {
  if (err) {
    console.error(err);
    process.exit(1); // bail out we can't connect to the DB
  } else {
    console.log("Database connected");
    global.db.run("PRAGMA foreign_keys=ON"); // tell SQLite to pay attention to foreign key constraints
  }
});

// get site name and description
app.use(function (req, res, next) {
  if (!req.session.organiser) {
    res.locals.siteName = "Event Manager";
    res.locals.siteDescription = "";
    return next();
  }
  const organiserId = req.session.organiser.id;
  global.db.get(
    "SELECT site_name, description FROM site_settings WHERE organiser_id = ?",
    [organiserId],
    function(err, row) {
      if (err || !row) {
        row = {
          site_name: req.session.organiser.site_name || "Event Manager",
          description: "",
        };
      }
      res.locals.siteName = row.site_name;
      res.locals.siteDescription = row.description;
      next();
    }
  );
});

// Add all the route handlers in usersRoutes to the app under the path /users
const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

// route handlers for organiser pages
const organiserRoutes = require("./routes/organiser");
app.use("/organiser", organiserRoutes);
// route handlers for attendee pages
const attendeeRoutes = require("./routes/attendee");
app.use("/attendee", attendeeRoutes);
// route handlers for home pages
const mainRoutes = require("./routes/main");
app.use("/", mainRoutes);
// route handlers for authentication
const authRoutes = require("./routes/auth");
app.use("/", authRoutes);

// Make the web application listen for HTTP requests
app.listen(port, () => {
  console.log(`Event Manager app listening on port ${port}`);
});
