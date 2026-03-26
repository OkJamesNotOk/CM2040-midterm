// routes/main.js
const express = require("express");
const router = express.Router();

/**
 * @desc Show the homepage with navigation links
 */
router.get("/", function (req, res) {
  res.render("main", {});
});

/**
 * @desc Render the manager dashboard
 */
router.get("/organiser", function (req, res) {
  res.render("organiser_home", {});
});

/**
 * @desc Render the attendee with event list page
 */
router.get("/attendee", function (req, res) {
  res.render("attendee_home", {});
});

module.exports = router;
