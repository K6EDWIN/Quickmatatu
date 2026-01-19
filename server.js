const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client/http');
const cors = require('cors');
const bcrypt = require('bcrypt');
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

// Initialize Database Client
const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

BigInt.prototype.toJSON = function () { return this.toString(); };

// --- 1. DATABASE SETUP ---
async function ensureTablesExist() {
    // Users Table
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

    // Routes Table
    await turso.execute(`
        CREATE TABLE IF NOT EXISTS routes (
            route_id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_name TEXT,
            start_point TEXT,
            end_point TEXT,
            intermediary_stops TEXT,
            estimated_duration TEXT,
            longitude DECIMAL(10, 8),
            latitude DECIMAL(10, 8),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tickets Table (Enhanced for Status Tracking)
    await turso.execute(`
        CREATE TABLE IF NOT EXISTS tickets (
            ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
            commuter_id TEXT,
            route_id INTEGER,
            pickup_point TEXT,
            booking_time TEXT,
            status TEXT DEFAULT 'pending' 
        )
    `);

    // Active Drivers Table (For Live Tracking)
    await turso.execute(`
        CREATE TABLE IF NOT EXISTS active_drivers (
            driver_id INTEGER PRIMARY KEY,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(10, 8),
            is_active BOOLEAN DEFAULT 1,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Initialize tables on startup
ensureTablesExist().catch(console.error);

router.get('/', (req, res) => res.send('QuickMatatu API is running'));

// --- 2. AUTHENTICATION ROUTES ---

router.post('/register', async (req, res) => {
    console.log("Register Request:", req.body);
    const { userType, username, email, password, license, nationalId } = req.body;
    
    if (!username || !password || !userType || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const check = await turso.execute({
            sql: "SELECT * FROM users WHERE email = ?",
            args: [email]
        });

        if (check.rows.length > 0) {
             return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users (userType, username, email, password, license_number, id_number)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            userType, 
            username, 
            email, 
            hashedPassword, 
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
            const match = await bcrypt.compare(password, user.password);
            
            if (!match) {
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
        res.json({ user: req.session.user });
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

// --- 3. LIVE TRACKING ROUTES ---

// Driver: Update Location (Go Online)
router.post('/update-location', async (req, res) => {
    const { driver_id, latitude, longitude } = req.body;

    if (!driver_id || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing location data" });
    }

    try {
        // Upsert: Insert if new, Update if exists
        await turso.execute({
            sql: `INSERT INTO active_drivers (driver_id, latitude, longitude, is_active, last_updated) 
                  VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
                  ON CONFLICT(driver_id) DO UPDATE SET 
                  latitude=excluded.latitude, longitude=excluded.longitude, last_updated=CURRENT_TIMESTAMP`,
            args: [driver_id, latitude, longitude]
        });
        res.json({ success: true, message: "Location updated" });
    } catch (err) {
        console.error("Location Update Error:", err);
        res.status(500).json({ error: "Failed to update location" });
    }
});

// User: Get Active Matatus (Nearby Drivers)
router.get('/active-matatus', async (req, res) => {
    try {
        // Only fetch drivers updated in the last 5 minutes
        const result = await turso.execute(`
            SELECT ad.*, u.username, u.license_number 
            FROM active_drivers ad
            JOIN users u ON ad.driver_id = u.user_id
            WHERE ad.is_active = 1 AND ad.last_updated > datetime('now', '-5 minutes')
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Active Matatus Error:", err);
        res.status(500).json({ error: "Failed to fetch matatus" });
    }
});

// --- 4. BOOKING & ROUTE ROUTES ---

// Get All Routes
router.get('/routes', async (req, res) => {
    try {
        const result = await turso.execute("SELECT * FROM routes");
        res.json(result.rows);
    } catch (err) {
        console.error("Fetch Routes Error:", err);
        res.status(500).json({ error: "Failed to fetch routes" });
    }
});

// User: Book a Ticket (Create Request)
router.post('/book-ticket', async (req, res) => {
    const { commuter_id, route_id, pickup_point, estimated_pickup_time } = req.body;

    if (!commuter_id || !route_id) {
        return res.status(400).json({ error: "Missing booking details" });
    }

    try {
        const result = await turso.execute({
            sql: `INSERT INTO tickets (commuter_id, route_id, pickup_point, booking_time, status) 
                  VALUES (?, ?, ?, ?, 'pending')`,
            args: [commuter_id, route_id, pickup_point, estimated_pickup_time]
        });

        res.json({ message: "Ticket booked successfully", ticketId: result.lastInsertRowid.toString() });

    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ error: "Booking failed" });
    }
});

// User: Get Booking History
router.get('/user/bookings/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await turso.execute({
            sql: `SELECT t.*, r.route_name, r.estimated_duration 
                  FROM tickets t 
                  JOIN routes r ON t.route_id = r.route_id 
                  WHERE t.commuter_id = ? 
                  ORDER BY t.booking_time DESC`,
            args: [userId]
        });
        res.json(result.rows);
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// Driver: Get Pending Booking Requests
router.get('/driver/bookings', async (req, res) => {
    try {
        const result = await turso.execute(`
            SELECT t.*, u.username as commuter_name 
            FROM tickets t
            JOIN users u ON t.commuter_id = u.user_id
            WHERE t.status = 'pending'
            ORDER BY t.booking_time DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Driver Bookings Error:", err);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
});

// Universal: Update Booking Status (Cancel, Accept, Reject)
router.post('/update-booking-status', async (req, res) => {
    const { ticket_id, status } = req.body; // status: 'cancelled', 'accepted', 'rejected', 'completed'

    if (!ticket_id || !status) {
        return res.status(400).json({ error: "Missing ticket ID or status" });
    }

    try {
        await turso.execute({
            sql: "UPDATE tickets SET status = ? WHERE ticket_id = ?",
            args: [status, ticket_id]
        });
        res.json({ message: `Booking ${status}` });
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).json({ error: "Update failed" });
    }
});

app.use('/api', router);

if (require.main === module) {
    app.listen(3001, () => console.log('Server running on port 3001'));
}

module.exports = app;