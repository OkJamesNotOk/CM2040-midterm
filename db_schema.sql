PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- organiser credentials
CREATE TABLE IF NOT EXISTS organisers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    site_name TEXT NOT NULL
);

-- Site name and description
CREATE TABLE IF NOT EXISTS site_settings (
    organiser_id INTEGER PRIMARY KEY,   
    username TEXT NOT NULL,
    site_name TEXT NOT NULL,
    description TEXT NOT NULL,
    
    FOREIGN KEY (organiser_id) REFERENCES organisers(id) ON DELETE CASCADE
);

-- scheduled events sessions
CREATE TABLE IF NOT EXISTS scheduled_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organiser_id INTEGER NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    event_title TEXT NOT NULL,
    event_description TEXT NOT NULL,
    ticket_price_1 REAL NOT NULL,
    ticket_price_2 REAL NOT NULL,
    display_status INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    capacity_ticket_1 INTEGER NOT NULL DEFAULT 0,
    capacity_ticket_2 INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (organiser_id) REFERENCES organisers(id) ON DELETE CASCADE
);

-- booked event
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    ticket_qty_1 INTEGER NOT NULL DEFAULT 0,
    ticket_qty_2 INTEGER NOT NULL DEFAULT 0,
    scheduled_event_id INTEGER NOT NULL,
    FOREIGN KEY (scheduled_event_id)
    REFERENCES scheduled_events(id) ON DELETE CASCADE
);

-- default credentials, password is 'test123'
INSERT INTO organisers (username, password, site_name)
VALUES
  ('baseball', 
   '$2b$10$d1nPfHRRUQA58F37EC72LeASDHDdW4RPBKlPw.B7BnpxrOf/SzUh.', 
   'BasedBalled'
  );

INSERT INTO site_settings (organiser_id, username, site_name, description)
VALUES
  (
    (SELECT id FROM organisers WHERE username = 'baseball'),
    'baseball',
    'BasedBalled',
    'This is a Based ball club'
  );

INSERT INTO scheduled_events (
  organiser_id,
  event_date,
  event_time,
  event_title,
  event_description,
  ticket_price_1,
  ticket_price_2,
  capacity_ticket_1,
  capacity_ticket_2,
  display_status
)
VALUES (
  (SELECT id FROM organisers WHERE username = 'baseball'),
  '2025-08-10',
  '19:00',
  'Game 1',
  'First game',
  20.00,
  10.00,
  150,
  75,
  1
);

INSERT INTO scheduled_events (
  organiser_id,
  event_date,
  event_time,
  event_title,
  event_description,
  ticket_price_1,
  ticket_price_2,
  capacity_ticket_1,
  capacity_ticket_2,
  display_status
)
VALUES (
  (SELECT id FROM organisers WHERE username = 'baseball'),
  '2025-08-24',
  '14:00',
  'Game 2',
  'Second Game',
  15.00,
  7.50,
  200,
  100,
  1
);

COMMIT;