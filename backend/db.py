import sqlite3
import os
from typing import Optional, List, Dict, Any
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "superu.db")

_initialized = False

def get_db():
    global _initialized
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if not _initialized:
        _initialized = True
        init_db(conn)
    return conn

def init_db(existing_conn=None):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = existing_conn or sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Table: tickets
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_name TEXT NOT NULL,
        store_city TEXT,
        ticket_number TEXT,
        caisse_number TEXT,
        date TEXT NOT NULL,
        total_amount REAL NOT NULL,
        discounts_total REAL DEFAULT 0.0,
        loyalty_earned REAL DEFAULT 0.0,
        loyalty_balance REAL,
        items_count INTEGER DEFAULT 0,
        payment_method TEXT,
        raw_text TEXT,
        source_type TEXT DEFAULT 'manual',
        source_filename TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Table: ticket_items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ticket_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        line_number INTEGER,
        raw_name TEXT NOT NULL,
        clean_name TEXT NOT NULL,
        category TEXT DEFAULT 'Autre',
        quantity REAL DEFAULT 1.0,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        discount REAL DEFAULT 0.0,
        unit_measure TEXT DEFAULT 'pièce',
        date TEXT NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );
    """)

    # Table: sync_config
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        sync_type TEXT DEFAULT 'imap',
        imap_server TEXT DEFAULT 'imap.gmail.com',
        imap_port INTEGER DEFAULT 993,
        imap_user TEXT,
        imap_password TEXT,
        search_query TEXT DEFAULT 'coursesu OR "Super U" OR "ticket de caisse"',
        auto_sync_interval_hours INTEGER DEFAULT 24,
        last_sync_time TEXT,
        last_sync_status TEXT,
        last_sync_message TEXT
    );
    """)

    # Table: sync_logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        finished_at TEXT,
        status TEXT,
        emails_found INTEGER DEFAULT 0,
        tickets_imported INTEGER DEFAULT 0,
        duplicates_skipped INTEGER DEFAULT 0,
        error_message TEXT
    );
    """)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_ticket ON ticket_items(ticket_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_clean_name ON ticket_items(clean_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_category ON ticket_items(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_date ON ticket_items(date);")

    conn.commit()
    if not existing_conn:
        conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized at", DB_PATH)
