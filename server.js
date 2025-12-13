const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client/http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const router = express.Router();

const allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:19006',
    process.env.EXPO_PUBLIC_API_URL, 
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(null, true); 
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'thatgo',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' },
}));

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

BigInt.prototype.toJSON = function () { return this.toString(); };

// Ensure Tables Exist
async function ensureTablesExist() {
    await turso.execute(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            userType TEXT NOT NULL,
            username TEXT,
            email TEXT UNIQUE,
            password TEXT NOT NULL,
            license_number TEXT,
            id_number TEXT
        )
    `);

    // Ensure routes table exists (you likely already have this based on your prompt)
    await turso.execute(`
        CREATE TABLE IF NOT EXISTS routes (
            route_id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_name TEXT,
            start_point TEXT,
            end_point TEXT,
            intermediary_stops TEXT,
            estimated_duration TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            longitude DECIMAL(10, 8),
            latitude DECIMAL(10, 8)
        )
    `);

    await turso.execute(`
        CREATE TABLE IF NOT EXISTS tickets (
            ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
            commuter_id TEXT,
            route_id INTEGER,
            pickup_point TEXT,
            booking_time TEXT,
            status TEXT DEFAULT 'active'
        )
    `);
}

// Initialize tables on startup
ensureTablesExist().catch(console.error);

router.get('/', (req, res) => res.send('QuickMatatu API is running'));

// --- AUTH ROUTES ---

router.post('/register', async (req, res) => {
    // ... (Your existing register logic) ...
    console.log("Register Request:", req.body);
    const { userType, username, email, password, license, nationalId } = req.body;
    
    if (!username || !password || !userType || !email) {
        return res.status(400).json({ error: 'Missing required fields (Email is required)' });
    }

    try {
        const check = await turso.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email]
        });

        if (check.rows.length > 0) {
             return res.status(409).json({ error: 'Email already registered' });
        }

        const query = `
            INSERT INTO users (userType, username, email, password, license_number, id_number)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
            userType, 
            username, 
            email, 
            password,
            userType === 'driver' ? license : null,
            userType === 'driver' ? nationalId : null,
        ];

        const result = await turso.execute({ sql: query, args: values });
        res.json({ message: 'User registered successfully', userId: result.lastInsertRowid.toString() });

    } catch (err) {
        console.error('Register Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    // ... (Your existing login logic) ...
    console.log("Login Request:", req.body);
    const { email, password } = req.body; 
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    try {
        const result = await turso.execute({ 
            sql: "SELECT * FROM users WHERE email = ?", 
            args: [email] 
        });

        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (password !== user.password) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }
            
            req.session.user = { 
                id: user.user_id.toString(), 
                username: user.username, 
                userType: user.userType 
            };

            res.json({ 
                message: 'Login successful', 
                user: req.session.user 
            });
        } else {
            res.status(401).json({ error: 'User not found.' });
        }
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Login error: ' + err.message });
    }
});

router.get('/get_user', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user, commuterId: req.session.user.id });
    } else {
        res.status(401).json({ error: 'Not logged in' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
    });
});

// --- ROUTE & TICKET ROUTES ---

router.get('/routes', async (req, res) => {
    try {
        const result = await turso.execute("SELECT * FROM routes");
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Routes Error:", err);
        res.status(500).json({ error: "Failed to fetch routes" });
    }
});

router.post('/book-ticket', async (req, res) => {
    const { commuter_id, route_id, pickup_point, estimated_pickup_time } = req.body;

    if (!commuter_id || !route_id) {
        return res.status(400).json({ error: "Missing booking details" });
    }

    try {
        const result = await turso.execute({
            sql: `INSERT INTO tickets (commuter_id, route_id, pickup_point, booking_time) 
                  VALUES (?, ?, ?, ?)`,
            args: [commuter_id, route_id, pickup_point, estimated_pickup_time]
        });

        res.json({ message: "Ticket booked successfully", ticketId: result.lastInsertRowid.toString() });

    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ error: "Booking failed" });
    }
});


app.use('/api', router);

if (require.main === module) {
    app.listen(3001, () => console.log('Server running on port 3001'));
}

module.exports = app;