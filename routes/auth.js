// routes/auth.js
const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

/**
 * @desc login page for organisers
 */
router.get("/login_organiser", function (req, res) {
  res.render("login_organiser", { alert: [] });
});

/**
 * @desc Login organiser
 * input username, password
 * output alert array
 * validation error return view login_organiser with alert array
 * invalid user credentials return view login_organiser with alert array
 * failed password comparison return view login_organiser with alert array
 * success return view organiser_home
 */
router.post(
  "/login_organiser",
  [
    // Validate input
    body("username")
      .trim()
      .isLength({ min: 2, max: 20 })
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage(
        "Username must be 2–20 letters or numbers, no special characters"
      ),
    body("password")
      .isLength({ min: 2, max: 20 })
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage(
        "Password must be 2–20 letters or numbers, no special characters"
      ),
  ],
  function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const alert = errors.array().map(function (e) {
        return { msg: e.msg };
      });
      return res.render("login_organiser", { alert });
    }
    const { username, password } = req.body;
    // Check credentials against the database
    const sql = "SELECT * FROM organisers WHERE username = ?";
    global.db.get(sql, [username], function (err, organiser) {
      if (err) return res.status(500).send("Database error");
      if (!organiser) {
        const alert = [{ msg: "Invalid credentials" }];
        return res.render("login_organiser", { alert });
      }
      bcrypt.compare(password, organiser.password, function (err2, result) {
        if (err2) return res.status(500).send("Password check failed");
        if (!result) {
          const alert = [{ msg: "Invalid credentials" }];
          return res.render("login_organiser", { alert });
        }
        req.session.organiser = organiser;
        res.redirect("/organiser");
      });
    });
  }
);

/**
 * @desc Logout organiser
 * render view login_organiser
 */
router.post("/logout", function (req, res) {
  req.session.destroy(function () {
    res.redirect("/login_organiser");
  });
});

/**
 * @desc Show signup page for organiser
 * render view signup_organiser with empty alert array
 */
router.get("/signup_organiser", function (req, res) {
  res.render("signup_organiser", { alert: [] });
});

/**
 * @desc Handle signup
 * input, username, password, site_name, site_description,
 * output alert array
 * validation errors return view signup_organiser with alert
 * duplicate error return view signup_organiser with alert
 * success return view organiser_home
 */
router.post(
  "/signup_organiser",
  [
    body("username")
      .trim()
      .isLength({ min: 2, max: 20 })
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage("Username must be 2–20 letters or numbers"),
    body("password")
      .isLength({ min: 6 })
      .matches(/^[A-Za-z0-9]+$/)
      .withMessage("Password must be 6–20 letters or numbers"),
    body("site_name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Site name is required"),
    body("site_description")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Site description is required"),
  ],
  function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("signup_organiser", { alert: errors.array() });
    }

    const { username, site_name, site_description, password } = req.body;

    // duplicate check
    global.db.get(
      "SELECT * FROM organisers WHERE username = ?",
      [username],
      function (err, existing) {
        if (err) return res.status(500).send("Database error");
        if (existing) {
          return res.render("signup_organiser", {
            alert: [{ msg: "Username already taken" }],
          });
        }

        // Hash and insert
        bcrypt.hash(password, 10, function (errHash, hash) {
          if (errHash) return res.status(500).send("Hashing failed");

          const insertQ =
            "INSERT INTO organisers (username, password, site_name) VALUES (?,?,?)";
          global.db.run(insertQ, [username, hash, site_name], function (err2) {
            if (err2) return res.status(500).send("Signup failed");
            const newId = this.lastID;

            const settingQ =
              "INSERT INTO site_settings (organiser_id, username, site_name, description) VALUES (?,?,?,?)";
            global.db.run(
              settingQ,
              [newId, username, site_name, site_description],
              function (err3) {
                if (err3) return res.status(500).send("Failed to Signup");

                req.session.organiser = { id: newId, username, site_name };
                res.redirect("/organiser");
              }
            );
          });
        });
      }
    );
  }
);

module.exports = router;
