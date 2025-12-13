const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client/http');
const cors = require('cors');
require('dotenv').config();

const app = express();
const router = express.Router();

// Allow connections from Expo (Development) and Production
const allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:19006',
    process.env.EXPO_PUBLIC_API_URL, 
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, true); // Dev mode: allow all
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'thatgo',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
        sameSite: 'lax',
    },
}));

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// --- AUTO-INITIALIZE DATABASE ---
// This runs once when the server starts to ensure the table exists
(async () => {
    try {
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
        console.log("Database table 'users' verified.");
    } catch (err) {
        console.error("Failed to initialize database:", err.message);
    }
})();

BigInt.prototype.toJSON = function () { return this.toString(); };

// --- ROUTES ---

router.get('/', (req, res) => {
    res.send('QuickMatatu API is running');
});

router.post('/register', async (req, res) => {
    console.log("Register Request Received:", req.body); // LOGGING ADDED

    const { userType, username, email, password, license, nationalId } = req.body;
    
    // Basic validation
    if (!username || !password || !userType) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const query = `
            INSERT INTO users (userType, username, email, password, license_number, id_number)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        // For commuter: license & id are NULL. For driver: email is NULL.
        const values = [
            userType,
            username,
            userType === 'commuter' ? email : null,
            password,
            userType === 'driver' ? license : null,
            userType === 'driver' ? nationalId : null,
        ];

        const result = await turso.execute({ sql: query, args: values });
        console.log("User created with ID:", result.lastInsertRowid);
        res.json({ message: 'User registered successfully', userId: result.lastInsertRowid.toString() });
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
});

router.post('/login', async (req, res) => {
    console.log("Login Request Received:", req.body);
    const { userType, email, id_number, password } = req.body;
    
    if (!userType || !password) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
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
            req.session.user = {
                id: user.user_id.toString(),
                username: user.username,
                userType: user.userType,
            };
            res.json({ message: 'Login successful', user: req.session.user });
        } else {
            res.status(401).json({ error: 'Invalid credentials.' });
        }
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'Login error.' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed.' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
    });
});

app.use('/api', router);

if (require.main === module) {
    app.listen(3001, () => console.log('Server running on port 3001'));
}

module.exports = app;