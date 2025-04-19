const express = require('express');
const path = require('path');
// Import database functions
const db = require('./database');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Basic route for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- API Endpoints ---

// Games API
app.get('/api/games', (req, res) => {
    try {
        const games = db.getAllGames();
        res.json(games);
    } catch (error) {
        console.error("Error fetching games:", error);
        res.status(500).json({ message: "Failed to fetch games" });
    }
});

app.post('/api/games', (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Invalid game name provided" });
    }
    try {
        const newGame = db.addGame(name.trim());
        res.status(201).json(newGame);
    } catch (error) {
        console.error("Error adding game:", error);
        // Check for unique constraint error (SQLite specific code)
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
             return res.status(409).json({ message: `Game "${name.trim()}" already exists.` });
        }
        res.status(500).json({ message: "Failed to add game" });
    }
});

// Customers API
app.get('/api/customers', (req, res) => {
    try {
        const customers = db.getAllCustomers();
        res.json(customers);
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ message: "Failed to fetch customers" });
    }
});

app.post('/api/customers', (req, res) => {
    const { name } = req.body;
     if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Invalid customer name provided" });
    }
    try {
        const newCustomer = db.addCustomer(name.trim());
        res.status(201).json(newCustomer);
    } catch (error) {
        console.error("Error adding customer:", error);
         if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
             return res.status(409).json({ message: `Customer "${name.trim()}" already exists.` });
        }
        res.status(500).json({ message: "Failed to add customer" });
    }
});

// Bets API
app.get('/api/bets', (req, res) => {
    // TODO: Add filtering based on query parameters (e.g., ?customerId=1&gameId=2)
    const filters = req.query; // Example: { customerId: '1', gameId: 'all' }
    try {
        const bets = db.getAllBets(filters);
        res.json(bets);
    } catch (error) {
        console.error("Error fetching bets:", error);
        res.status(500).json({ message: "Failed to fetch bets" });
    }
});

app.post('/api/bets', (req, res) => {
    const betData = req.body;
    // Add server-side validation here (more robust than just client-side)
    if (!betData.customerId || !betData.gameId || !betData.betType || !betData.number || !betData.amount) {
         return res.status(400).json({ message: "Missing required bet information." });
    }
     if (betData.betType !== 'SD' && betData.betType !== 'DD') {
         return res.status(400).json({ message: "Invalid bet type." });
     }
     // Add more validation for number format, amount etc.

    try {
        const newBet = db.addBet(betData);
        res.status(201).json(newBet);
    } catch (error) {
        console.error("Error adding bet:", error);
         if (error.message.includes("FOREIGN KEY constraint failed")) {
             return res.status(400).json({ message: "Invalid customer or game ID provided." });
         }
        res.status(500).json({ message: "Failed to add bet" });
    }
});

// Endpoint to delete bets based on filters
app.delete('/api/bets', (req, res) => {
    const { gameId, customerId } = req.query; // Filters from query params

    // Basic validation: Ensure filters are provided
    if (!gameId || !customerId) {
        return res.status(400).json({ message: "Both gameId and customerId filters are required for deletion." });
    }

    try {
        const deletedCount = db.deleteBets({ gameId, customerId });
        if (deletedCount > 0) {
            res.status(200).json({ message: `Successfully deleted ${deletedCount} bets.` });
        } else {
            // Could be that no bets matched the criteria
            res.status(200).json({ message: "No bets found matching the criteria to delete." });
        }
    } catch (error) {
        console.error("Error deleting bets:", error);
        res.status(500).json({ message: "Failed to delete bets" });
    }
});

// Summary API
app.get('/api/summary', (req, res) => {
    const { gameId, customerId } = req.query; // e.g., ?gameId=1&customerId=2
    try {
        // Pass both filters to the database function
        const summary = db.getCustomerSummary(gameId, customerId);
        res.json(summary);
    } catch (error) {
        console.error("Error fetching summary:", error);
        res.status(500).json({ message: "Failed to fetch summary" });
    }
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log('Database file located at:', path.join(__dirname, 'game_bets.db'));
});
