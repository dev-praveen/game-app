const Database = require('better-sqlite3');
const path = require('path');

// Get the database path from command line argument or use default
const dbPath = process.argv[2] || path.join(__dirname, 'game_bets.db');

console.log('Creating new database at:', dbPath);

// Initialize the database connection
const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        bet_type TEXT NOT NULL CHECK(bet_type IN ('SD', 'DD')),
        number TEXT NOT NULL,
        amount REAL NOT NULL,
        bet_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bets_customer_game ON bets (customer_id, game_id);
    CREATE INDEX IF NOT EXISTS idx_bets_game ON bets (game_id);
`);

console.log('Database schema created successfully!');

// Close the database connection
db.close();