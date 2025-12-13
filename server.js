const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client/http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const router = express.Router();

// --- CONFIGURATION CHECK ---
const DB_URL = process.env.TURSO_DATABASE_URL;
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!DB_URL || !DB_TOKEN) {
    console.error("CRITICAL ERROR: Missing Database Env Variables!");
}

const turso = DB_URL && DB_TOKEN ? createClient({
    url: DB_URL,
    authToken: DB_TOKEN,
}) : null;

// Allow connections
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
            callback(null, true); // Dev mode: allow all
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

// --- HELPER: Ensure Table Exists ---
async function ensureTableExists() {
    if (!turso) throw new Error("Database not connected (Missing Env Vars)");
    await turso.execute(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            userType TEXT NOT NULL,
            username TEXT,
            email TEXT,
            password TEXT NOT NULL,
            license_number TEXT,
            id_number TEXT
        )
    `);
}

// --- HEALTH CHECK ROUTE ---
// Hit this URL in your browser: https://your-app.vercel.app/api/health
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        database: turso ? 'connected' : 'missing_credentials',
        env: {
            hasUrl: !!process.env.TURSO_DATABASE_URL,
            hasToken: !!process.env.TURSO_AUTH_TOKEN
        }
    });
});

router.post('/register', async (req, res) => {
    console.log("Register Request:", req.body);
    const { userType, username, email, password, license, nationalId } = req.body;
    
    if (!username || !password || !userType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await ensureTableExists();

        // Check if user exists
        const check = await turso.execute({
            sql: "SELECT * FROM users WHERE email = ? OR username = ?",
            args: [email || "", username]
        });

        if (check.rows.length > 0) {
             return res.status(409).json({ error: 'User already exists' });
        }

        // Insert
        const query = `
            INSERT INTO users (userType, username, email, password, license_number, id_number)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
            userType, username, 
            userType === 'commuter' ? email : null,
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
    const { userType, email, id_number, password } = req.body;
    try {
        if (!turso) throw new Error("Database not connected");
        
        let query, values;
        if (userType === 'commuter') {
            query = `SELECT * FROM users WHERE email = ? AND userType = 'commuter'`;
            values = [email];
        } else {
            query = `SELECT * FROM users WHERE id_number = ? AND userType = 'driver'`;
            values = [id_number];
        }

        const result = await turso.execute({ sql: query, args: values });
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (password !== user.password) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }
            req.session.user = { id: user.user_id.toString(), username: user.username, userType: user.userType };
            res.json({ message: 'Login successful', user: req.session.user });
        } else {
            res.status(401).json({ error: 'Invalid credentials.' });
        }
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Login error: ' + err.message });
    }
});

// Mount router at /api
app.use('/api', router);

if (require.main === module) {
    app.listen(3001, () => console.log('Server running on port 3001'));
}

module.exports = app;