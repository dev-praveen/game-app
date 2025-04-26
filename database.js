const Database = require('better-sqlite3');
const path = require('path');

// Define the path for the database file, handling both development and packaged environments
const dbPath = process.pkg
    ? path.join(path.dirname(process.execPath), 'game_bets.db')
    : path.join(__dirname, 'game_bets.db');

// Initialize the database connection
// verbose: console.log logs executed SQL statements
const db = new Database(dbPath, { verbose: console.log });

// Ensure foreign key constraints are enabled (good practice for relational integrity)
db.pragma('foreign_keys = ON');

// --- Schema Creation ---
// Use execute for statements that don't return results
function setupDatabase() {
    console.log('Setting up database schema...');

    // Games Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Customers Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Bets Table
    // bet_type: 'SD' (Single Digit) or 'DD' (Double Digit)
    // number: Stores the number bet on (e.g., '5' for SD, '23' for DD)
    db.exec(`
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
    `);

    // Optional: Indexes for faster lookups on foreign keys or frequently queried columns
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bets_customer_game ON bets (customer_id, game_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bets_game ON bets (game_id);`);


    console.log('Database schema setup complete.');
}

// Run setup when the module is loaded
setupDatabase();

// --- Database Interaction Functions ---

// Function to add a new game
function addGame(name) {
    const stmt = db.prepare('INSERT INTO games (name) VALUES (?)');
    const info = stmt.run(name);
    // Return the newly created game with its ID
    return getGameById(info.lastInsertRowid);
}

// Function to get a game by ID
function getGameById(id) {
    const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
    return stmt.get(id);
}

// Function to get all games
function getAllGames() {
    const stmt = db.prepare('SELECT * FROM games ORDER BY name');
    return stmt.all();
}

// Function to delete a game (associated bets are deleted by CASCADE)
function deleteGame(id) {
    const stmt = db.prepare('DELETE FROM games WHERE id = ?');
    const info = stmt.run(id);
    console.log(`Deleted game ID ${id}, changes: ${info.changes}`);
    return info.changes; // Returns the number of rows deleted (0 or 1)
}

// Function to add a new customer
function addCustomer(name) {
    const stmt = db.prepare('INSERT INTO customers (name) VALUES (?)');
    const info = stmt.run(name);
    return getCustomerById(info.lastInsertRowid);
}

// Function to get a customer by ID
function getCustomerById(id) {
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    return stmt.get(id);
}

// Function to get all customers
function getAllCustomers() {
    const stmt = db.prepare('SELECT * FROM customers ORDER BY name');
    return stmt.all();
}

// Function to delete a customer (associated bets are deleted by CASCADE)
function deleteCustomer(id) {
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    const info = stmt.run(id);
    console.log(`Deleted customer ID ${id}, changes: ${info.changes}`);
    return info.changes; // Returns the number of rows deleted (0 or 1)
}

// Function to add a new bet
function addBet({ customerId, gameId, betType, number, amount, betDate }) {
    // Basic validation (more robust validation might be needed)
    if (!customerId || !gameId || !betType || !number || amount == null || amount <= 0) {
        throw new Error("Invalid bet data provided");
    }
    const stmt = db.prepare(`
        INSERT INTO bets (customer_id, game_id, bet_type, number, amount, bet_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(customerId, gameId, betType, number, amount, betDate || new Date().toISOString().split('T')[0]);
    return getBetById(info.lastInsertRowid);
}

// Function to get a bet by ID
function getBetById(id) {
    const stmt = db.prepare('SELECT * FROM bets WHERE id = ?');
    return stmt.get(id);
}

// Function to get all bets (potentially filtered later)
function getAllBets(filters = {}) {
    let sql = `
        SELECT b.*, c.name as customer_name, g.name as game_name
        FROM bets b
        JOIN customers c ON b.customer_id = c.id
        JOIN games g ON b.game_id = g.id
    `;
    const params = [];
    const conditions = [];

    if (filters.customerId) {
        conditions.push('b.customer_id = ?');
        params.push(filters.customerId);
    }
    if (filters.gameId && filters.gameId !== 'all') { // Handle 'all' filter case
        conditions.push('b.game_id = ?');
        params.push(filters.gameId);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY b.created_at DESC'; // Or order as needed

    const stmt = db.prepare(sql);
    return stmt.all(...params);
}

// Function to delete bets based on filters
function deleteBets(filters = {}) {
    // Allow deleting ALL bets if both filters are 'all'
    if (filters.gameId === 'all' && filters.customerId === 'all' && !filters.date) {
        console.warn("Executing DELETE for ALL bets!");
        // Begin a transaction to ensure data consistency
        const transaction = db.transaction(() => {
            // First delete all bets
            const deleteAllBets = db.prepare('DELETE FROM bets');
            const betsDeleted = deleteAllBets.run();
            
            // Then delete all games
            const deleteGames = db.prepare('DELETE FROM games');
            deleteGames.run();
            
            // Finally delete all customers
            const deleteCustomers = db.prepare('DELETE FROM customers');
            deleteCustomers.run();
            
            return betsDeleted.changes;
        });
        
        // Execute the transaction
        const changes = transaction();
        console.log(`Deleted ${changes} bets and cleared games and customers.`);
        return changes;
    }

    let sql = 'DELETE FROM bets';
    const params = [];
    const conditions = [];

    if (filters.customerId && filters.customerId !== 'all') {
        conditions.push('customer_id = ?');
        params.push(filters.customerId);
    }
    if (filters.gameId && filters.gameId !== 'all') {
        conditions.push('game_id = ?');
        params.push(filters.gameId);
    }
    if (filters.date) {
        conditions.push('date(bet_date) = date(?)');
        params.push(filters.date);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    console.log(`Executing DELETE: ${sql} with params: ${params}`);
    const stmt = db.prepare(sql);
    const info = stmt.run(...params);
    console.log(`Deleted ${info.changes} bets.`);
    return info.changes;
}

// Function to calculate customer summary
function getCustomerSummary(gameId = 'all', customerId = 'all', date = null) {
    let sql = `
        SELECT
            c.id as customer_id,
            c.name as customer_name,
            g.name as game_name,
            SUM(b.amount) as total_amount
        FROM bets b
        JOIN customers c ON b.customer_id = c.id
        JOIN games g ON b.game_id = g.id
    `;
    const params = [];
    const conditions = [];

    if (gameId && gameId !== 'all') {
        conditions.push('b.game_id = ?');
        params.push(gameId);
    }
    if (customerId && customerId !== 'all') {
        conditions.push('b.customer_id = ?');
        params.push(customerId);
    }
    if (date) {
        conditions.push('date(b.bet_date) = date(?)');
        params.push(date);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += `
        GROUP BY c.id, c.name, g.id, g.name
        ORDER BY total_amount DESC, c.name, g.name;
    `;

    const stmt = db.prepare(sql);
    return stmt.all(...params);
}

// Function to get grid bets with filters
function getGridBets(filters = {}) {
    let sql = `
        SELECT b.bet_type, b.number, b.amount
        FROM bets b
        JOIN games g ON b.game_id = g.id
        JOIN customers c ON b.customer_id = c.id
        WHERE 1=1
    `;
    const params = [];

    if (filters.date) {
        sql += ` AND DATE(b.bet_date) = DATE(?)`;
        params.push(filters.date);
    }
    if (filters.gameId && filters.gameId !== 'all') {
        sql += ` AND b.game_id = ?`;
        params.push(filters.gameId);
    }
    if (filters.customerId && filters.customerId !== 'all') {
        sql += ` AND b.customer_id = ?`;
        params.push(filters.customerId);
    }

    console.log('Executing grid query:', sql, params);
    const stmt = db.prepare(sql);
    return stmt.all(...params);
}

// Function to get detailed bet summary
function getDetailedBetSummary(gameId = 'all', customerId = 'all', date = null) {
    let sql = `
        SELECT
            c.name as customer_name,
            g.name as game_name,
            b.bet_type,
            b.number,
            b.amount
        FROM bets b
        JOIN customers c ON b.customer_id = c.id
        JOIN games g ON b.game_id = g.id
    `;
    const params = [];
    const conditions = [];

    if (gameId && gameId !== 'all') {
        conditions.push('b.game_id = ?');
        params.push(gameId);
    }
    if (customerId && customerId !== 'all') {
        conditions.push('b.customer_id = ?');
        params.push(customerId);
    }
    if (date) {
        conditions.push('date(b.bet_date) = date(?)');
        params.push(date);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.name, g.name, b.bet_type, b.number';

    const stmt = db.prepare(sql);
    return stmt.all(...params);
}

// Function to execute a query and return all results
function all(query, params) {
    try {
        const stmt = db.prepare(query);
        return stmt.all(...params);
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
}

// Export functions to be used by the server
module.exports = {
    addGame,
    getAllGames,
    deleteGame, // Export deleteGame
    addCustomer,
    getAllCustomers,
    deleteCustomer, // Export deleteCustomer
    addBet,
    getAllBets,
    deleteBets, // Export deleteBets
    getCustomerSummary,
    getGridBets, // Export getGridBets
    getDetailedBetSummary,
    all, // Export the all function
    // Export db instance if direct access is needed elsewhere (use with caution)
    // db
};

// Graceful shutdown
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
