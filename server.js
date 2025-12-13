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

// Ensure Table Exists
async function ensureTableExists() {
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
}

router.get('/', (req, res) => res.send('QuickMatatu API is running'));

// --- UPDATED REGISTER ROUTE ---
router.post('/register', async (req, res) => {
    console.log("Register Request:", req.body);
    const { userType, username, email, password, license, nationalId } = req.body;
    
    // Validate Email for everyone now
    if (!username || !password || !userType || !email) {
        return res.status(400).json({ error: 'Missing required fields (Email is required)' });
    }

    try {
        await ensureTableExists();

        // Check if email already exists
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
        // Save email for BOTH drivers and commuters
        const values = [
            userType, 
            username, 
            email, // Always save email
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

// --- UPDATED LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    console.log("Login Request:", req.body);
    const { email, password } = req.body; // Removed userType and id_number requirement
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    try {
        await ensureTableExists();

        // Find user by EMAIL only
        const result = await turso.execute({ 
            sql: "SELECT * FROM users WHERE email = ?", 
            args: [email] 
        });

        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (password !== user.password) {
                return res.status(401).json({ error: 'Invalid credentials.' });
            }
            
            // Save session
            req.session.user = { 
                id: user.user_id.toString(), 
                username: user.username, 
                userType: user.userType 
            };

            // Return userType so frontend knows where to navigate
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

app.use('/api', router);

if (require.main === module) {
    app.listen(3001, () => console.log('Server running on port 3001'));
}

module.exports = app;