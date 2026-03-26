// routes/organiser.js

const express = require("express");
const router = express.Router();

/**
 * @desc redirect to organiser login if not logged in
 * render view login_organiser
 */
router.use(function (req, res, next) {
  if (!req.session.organiser) return res.redirect("/login_organiser");
  next();
});

/**
 * @desc Organiser dashboard: list all scheduled events
 * input session organiser id
 * output events array
 * render organiser_home with events array
 */
router.get("/", function (req, res, next) {
  const organiserId = req.session.organiser.id;

  const listQ = `
  SELECT e.*,
  COALESCE(SUM(b.ticket_qty_1),0) AS sold_1,
  COALESCE(SUM(b.ticket_qty_2),0) AS sold_2,
  (e.capacity_ticket_1 - COALESCE(SUM(b.ticket_qty_1),0)) AS available_1,
  (e.capacity_ticket_2 - COALESCE(SUM(b.ticket_qty_2),0)) AS available_2
  FROM scheduled_events e
  LEFT JOIN bookings b ON b.scheduled_event_id = e.id
  WHERE e.organiser_id = ?
  GROUP BY e.id
  ORDER BY e.event_date, e.event_time;
  `;
  global.db.all(listQ, [organiserId], function (err, events) {
    if (err) return next(err);
    res.render("organiser_home", {
      events: events || [],
    });
  });
});

/**
 * @desc Delete scheduled event
 * input event id, organiser id
 * render view organiser
 */
router.post("/delete/:id", function (req, res, next) {
  const organiserId = req.session.organiser.id;
  const id = req.params.id;

  global.db.run(
    "DELETE FROM scheduled_events WHERE id = ? AND organiser_id = ?",
    [id, organiserId],
    function (err) {
      if (err) return next(err);
      res.redirect("/organiser");
    }
  );
});

/**
 * @desc add event page
 * render view organiser_add_event
 */
router.get("/add", function (req, res, next) {
  res.render("organiser_add_event", {});
});

/**
 * @desc edit an event
 * input organiser id, event id
 * output ev
 * render view organiser_edit_event with ev
 */
router.get("/edit/:id", function (req, res, next) {
  const organiserId = req.session.organiser.id;
  const id = req.params.id;

  global.db.get(
    "SELECT * FROM scheduled_events WHERE id = ? AND organiser_id = ?",
    [id, organiserId],
    function (err, ev) {
      if (err) return next(err);
      if (!ev) return res.status(404).send("Event not found");

      res.render("organiser_edit_event", {
        event: ev,
      });
    }
  );
});

/**
 * @desc Submit the update to an existing event
 * input event id, event_date, event_time, event_title, 
  event_description, ticket_price_1, ticket_price_2,
  capacity_ticket_1, capacity_ticket_2, display_status
 * 
 * render view organiser_home
 */
router.post("/edit/:id", function (req, res, next) {
  const organiserId = req.session.organiser.id;
  const id = req.params.id;
  const {
    event_date,
    event_time,
    event_title,
    event_description,
    ticket_price_1,
    ticket_price_2,
    capacity_ticket_1,
    capacity_ticket_2,
    display_status,
  } = req.body;

  const updateQ = `
  UPDATE scheduled_events
  SET event_date = ?, event_time = ?,
  event_title = ?, event_description = ?,
  ticket_price_1 = ?, ticket_price_2 = ?,
  capacity_ticket_1 = ?, capacity_ticket_2 = ?,
  display_status = ?,
  updated_at = CURRENT_TIMESTAMP
  WHERE id = ? AND organiser_id = ?
  `;

  const vals = [
    event_date,
    event_time,
    event_title.trim(),
    event_description.trim(),
    ticket_price_1,
    ticket_price_2,
    capacity_ticket_1,
    capacity_ticket_2,
    display_status ? 1 : 0,
    id,
    organiserId,
  ];

  global.db.run(updateQ, vals, function (err) {
    if (err) return next(err);
    res.redirect("/organiser");
  });
});

/**
 * @desc Submit new event schedule
 * input event id, event_date, event_time, event_title, 
  event_description, ticket_price_1, ticket_price_2,
  capacity_ticket_1, capacity_ticket_2, display_status
 * 
 * render view organiser_home
 */
router.post("/add", function (req, res, next) {
  const organiserId = req.session.organiser.id;
  const {
    event_date,
    event_time,
    event_title,
    event_description,
    ticket_price_1,
    ticket_price_2,
    capacity_ticket_1,
    capacity_ticket_2,
    display_status,
  } = req.body;

  const insertQ = `
  INSERT INTO scheduled_events
  (organiser_id, event_date, event_time,
  event_title, event_description,
  ticket_price_1, ticket_price_2,
  capacity_ticket_1, capacity_ticket_2, 
  display_status)
  VALUES (?,?,?,?,?,?,?,?,?,?)
  `;

  const vals = [
    organiserId,
    event_date,
    event_time,
    event_title.trim(),
    event_description.trim(),
    ticket_price_1,
    ticket_price_2,
    capacity_ticket_1,
    capacity_ticket_2,
    display_status ? 1 : 0,
  ];

  global.db.run(insertQ, vals, function (err) {
    if (err) return next(err);
    res.redirect("/organiser");
  });
});

/**
 * @desc View attendees for a specific event
 * input organiser id, event id
 * output ev, rows array
 * render view organiser_view_bookings with ev, rows
 */
router.get("/view_bookings/:id", function (req, res, next) {
  const organiserId = req.session.organiser.id;
  const id = req.params.id;

  const evQ = "SELECT * FROM scheduled_events WHERE id=? AND organiser_id=?";
  const bkQ = `SELECT customer_name, ticket_qty_1, ticket_qty_2
  FROM bookings WHERE scheduled_event_id=?`;

  global.db.get(evQ, [id, organiserId], function (err, ev) {
    if (err) return next(err);
    if (!ev) return res.status(404).send("Event not found");
    global.db.all(bkQ, [id], function (err2, rows) {
      if (err2) return next(err2);
      res.render("organiser_view_bookings", {
        event: ev,
        bookings: rows || [],
      });
    });
  });
});

/**
 * @desc Show form to edit site settings
 * input organiser id
 * output row
 * render view site_setting with row
 */
router.get("/site_setting", function (req, res, next) {
  const organiserId = req.session.organiser.id;
  global.db.get(
    "SELECT * FROM site_settings WHERE organiser_id=?",
    [organiserId],
    function (err, row) {
      if (err) return next(err);
      res.render("site_setting", {
        site: row || {
          site_name: req.session.organiser.site_name,
          description: "",
        },
      });
    }
  );
});

/**
 * @desc Submit updated site settings
 * input organiser id, site_name, description
 * render view organiser_home
 */
router.post("/site_setting", function (req, res, next) {
  const organiserId = req.session.organiser.id;
  const { site_name, description } = req.body;

  //upsert into site settings
  const insertQ = `
  INSERT INTO site_settings (organiser_id, username, site_name, description)
  VALUES (?,?,?,?)
  ON CONFLICT(organiser_id) DO UPDATE 
  SET site_name = excluded.site_name,
  description = excluded.description
  `;

  const settingsVals = [
    organiserId,
    req.session.organiser.username,
    site_name.trim(),
    description.trim(),
  ];

  global.db.run(
    insertQ,
    [
      organiserId,
      req.session.organiser.username,
      site_name.trim(),
      description.trim(),
    ],
    function (err) {
      if (err) return next(err);
      // update organiser name
      const updateQ = `      
      UPDATE organisers
      SET site_name = ?
      WHERE id = ?
      `;
      global.db.run(updateQ, [site_name.trim(), organiserId], function (err2) {
        if (err2) return next(err2);

        res.locals.siteName = site_name.trim();
        res.locals.siteDescription = description.trim();
        res.redirect("/organiser");
      });
    }
  );
});

module.exports = router;
