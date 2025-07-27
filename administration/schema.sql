-- Club Management System Database Schema
-- SQLite implementation

-- Core member information
CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,
    email TEXT UNIQUE NOT NULL,
    pronouns TEXT,
    sponsor_notes TEXT,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    flags INTEGER DEFAULT 1, -- Bitfield: 1=active, 2=professional_affiliate
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment status lookup table
CREATE TABLE payment_statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    flags INTEGER DEFAULT 1, -- Bitfield: 1=active
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Membership types/tiers
CREATE TABLE membership_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER, -- NULL for free memberships
    flags INTEGER DEFAULT 1, -- Bitfield: 1=active, 2=recurring, 4=exclusive_group
    exclusive_group_id TEXT, -- identifier for mutually exclusive groups
    benefits_json TEXT, -- JSON array of benefits
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for member memberships (supports multiple/historical)
CREATE TABLE member_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    membership_type_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL for active memberships
    payment_status_id INTEGER, -- reference to configurable payment statuses
    external_payment_reference TEXT, -- e.g., Patreon subscription ID
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id),
    FOREIGN KEY (membership_type_id) REFERENCES membership_types (id),
    FOREIGN KEY (payment_status_id) REFERENCES payment_statuses (id)
);

-- Events (including Eventbrite integration)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    flags INTEGER DEFAULT 3, -- Bitfield: 1=active, 2=public
    eventbrite_id TEXT, -- external integration
    eventbrite_url TEXT,
    max_capacity INTEGER,
    required_membership_types TEXT, -- JSON array of membership type IDs
    created_by_member_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_member_id) REFERENCES members (id)
);


-- Member event attendance
CREATE TABLE event_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    checked_in_at DATETIME,
    checked_out_at DATETIME,
    attendance_source TEXT DEFAULT 'manual', -- 'manual', 'eventbrite', 'door_scan', etc.
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events (id),
    FOREIGN KEY (member_id) REFERENCES members (id),
    UNIQUE(event_id, member_id)
);



-- External system integrations tracking
CREATE TABLE external_integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    system_name TEXT NOT NULL, -- 'eventbrite', 'patreon', 'discord', 'kayvio'
    external_id TEXT NOT NULL,
    external_data_json TEXT, -- store relevant external data
    last_synced_at DATETIME,
    flags INTEGER DEFAULT 1, -- Bitfield: 1=active
    FOREIGN KEY (member_id) REFERENCES members (id),
    UNIQUE(member_id, system_name, external_id)
);



-- Indexes for performance
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_active ON members(flags);
CREATE INDEX idx_member_memberships_active ON member_memberships(member_id, end_date);
CREATE INDEX idx_events_datetime ON events(start_datetime, end_datetime);
CREATE INDEX idx_event_attendance_member ON event_attendance(member_id);
CREATE INDEX idx_external_integrations_lookup ON external_integrations(member_id, system_name);
CREATE INDEX idx_member_memberships_payment_status ON member_memberships(payment_status_id);

