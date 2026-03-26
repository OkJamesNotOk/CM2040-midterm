// routes/attendee.js

const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

/**
 * @desc Show published events
 * input none
 * output event array
 * render view attendee_home with events array
 */
router.get("/", function (req, res) {
  const sql = `
  SELECT
  e.*,
  o.site_name,
  COALESCE(SUM(b.ticket_qty_1),0) AS sold_1,
  COALESCE(SUM(b.ticket_qty_2),0) AS sold_2,
  (e.capacity_ticket_1 - COALESCE(SUM(b.ticket_qty_1),0)) AS avail_1,
  (e.capacity_ticket_2 - COALESCE(SUM(b.ticket_qty_2),0)) AS avail_2
  FROM scheduled_events e
  LEFT JOIN bookings b ON b.scheduled_event_id = e.id 
  JOIN organisers o ON e.organiser_id = o.id
  WHERE e.display_status = 1
  GROUP BY e.id
  ORDER BY e.event_date, e.event_time
  `;
  global.db.all(sql, [], function (err, events) {
    if (err) {
      console.error("Failed to load events:", err.message);
      return res.status(500).send("Database error.");
    }
    // render attendee home page with events
    res.render("attendee_home", {
      events: events || [],
    });
  });
});

/**
 * @desc Book an event
 * input customer_name, ticket_qty_1, ticket_qty_2, event_id
 * output thisEvent
 * validation errors return view attendee_book with thisEvent, old, alerts array
 * over capcity errors return view attendee_book with thisEvent, old, alerts array
 * succeed return view attendee_success with name, event, qty1, qty2
 */
router.post(
  "/submit_book",
  [
    body("customer_name")
      .trim()
      .isLength({ min: 2, max: 40 })
      .matches(/^[A-Za-z\s]+$/)
      .withMessage("Name must be 2–40 letters / spaces"),
    body("ticket_qty_1")
      .isInt({ min: 0 })
      .withMessage("Tickets must be 0 or more"),
    body("ticket_qty_2")
      .isInt({ min: 0 })
      .withMessage("Concession tickets must be 0 or more"),
  ],
  function (req, res, next) {
    const errors = validationResult(req);
    const { event_id, customer_name, ticket_qty_1, ticket_qty_2 } = req.body;

    // check if there is at least one ticket
    if (errors.isEmpty() && Number(ticket_qty_1) + Number(ticket_qty_2) == 0) {
      errors.errors.push({ msg: "Please select at least one ticket" });
    }
    if (!errors.isEmpty()) {
      eventQ = "SELECT * FROM scheduled_events WHERE id = ?";
      return global.db.get(eventQ, [event_id], function (err, thisEvent) {
        if (err) return next(err);
        // render booking pages with errors
        return res.render("attendee_book", {
          thisEvent,
          alert: errors.array(),
          old: { customer_name, ticket_qty_1, ticket_qty_2 },
        });
      });
    }

    // check if tickets amount exceeds capacity
    const capQ = `
      SELECT 
      e.capacity_ticket_1, e.capacity_ticket_2,
      COALESCE(SUM(b.ticket_qty_1),0) AS sold_1,
      COALESCE(SUM(b.ticket_qty_2),0) AS sold_2
      FROM scheduled_events e
      LEFT JOIN bookings b
      ON b.scheduled_event_id = e.id
      WHERE e.id = ?
      GROUP BY e.capacity_ticket_1, e.capacity_ticket_2
    `;
    global.db.get(capQ, [event_id], function (err, cap) {
      if (err) return next(err);
      const avail1 = cap.capacity_ticket_1 - cap.sold_1;
      const avail2 = cap.capacity_ticket_2 - cap.sold_2;
      const t1 = Number(ticket_qty_1);
      const t2 = Number(ticket_qty_2);

      // errors messages
      const capErrors = [];
      if (t1 > avail1) capErrors.push({ msg: `Only ${avail1} tickets left` });
      if (t2 > avail2)
        capErrors.push({ msg: `Only ${avail2} concession tickets left` });
      if (capErrors.length) {
        const q = "SELECT * FROM scheduled_events WHERE id = ?";
        // output: thisEvent
        return global.db.get(q, [event_id], function (err2, thisEvent) {
          if (err2) return next(err2);
          // render booking page with errors
          return res.render("attendee_book", {
            thisEvent,
            alert: capErrors,
            old: { customer_name, ticket_qty_1, ticket_qty_2 },
          });
        });
      }

      // insert booking
      const insertQ = `
        INSERT INTO bookings
        (customer_name, ticket_qty_1, ticket_qty_2, scheduled_event_id)
        VALUES (?,?,?,?)
      `;

      const vals = [customer_name.trim(), ticket_qty_1, ticket_qty_2, event_id];
      global.db.run(insertQ, vals, function (err3) {
        if (err3) return next(err3);
        //render the success page
        res.render("attendee_success", {
          name: customer_name.trim(),
          event: event_id,
          qty1: ticket_qty_1,
          qty2: ticket_qty_2,
        });
      });
    });
  }
);

/**
 * @desc Show the booking page for selected event
 * input event ID
 * output thisEvent
 * render view attendee_book with thisEvent, old, alerts array
 */
router.get("/book/:id", function (req, res, next) {
  const id = req.params.id;

  // Fetch the event details using ID
  const eventQ = `
  SELECT
  e.*,
  o.site_name,
  COALESCE(SUM(b.ticket_qty_1),0) AS sold_1,
  COALESCE(SUM(b.ticket_qty_2),0) AS sold_2,
  (e.capacity_ticket_1 - COALESCE(SUM(b.ticket_qty_1),0)) AS avail_1,
  (e.capacity_ticket_2 - COALESCE(SUM(b.ticket_qty_2),0)) AS avail_2
  FROM scheduled_events e
  LEFT JOIN bookings b ON b.scheduled_event_id = e.id 
  JOIN organisers o ON e.organiser_id = o.id
  WHERE e.id = ? AND e.display_status = 1
  GROUP BY e.id
  ORDER BY e.event_date, e.event_time
  `;
  global.db.get(eventQ, [id], function (err, thisEvent) {
    if (err) {
      console.error("Database error:", err);
      return next(err);
    }

    if (!thisEvent) return res.status(404).send("Event not found");

    // render the booking page with the event details
    res.render("attendee_book", {
      thisEvent,
      alert: [],
      old: {
        name: req.session.attendeeName || "",
        groupSize: 1,
      },
      ticket_qty_1: 0,
      ticket_qty_2: 0,
    });
  });
});

module.exports = router;
