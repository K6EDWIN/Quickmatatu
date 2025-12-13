const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client/http'); 
const cors = require('cors');
require('dotenv').config(); 

const app = express();
const router = express.Router(); 

// Use environment variable for allowed origins, or allow all for dev
const allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:19006',
    process.env.EXPO_PUBLIC_API_URL,
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // For development, allow all. For strict production, uncomment the error.
            return callback(null, true); 
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json());

// WARNING: MemoryStore leaks memory. For production, use connect-redis or similar.
app.use(session({
    secret: process.env.SESSION_SECRET || 'thatgo',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true on https
        httpOnly: true,
        maxAge: 1000 * 60 * 60,
        sameSite: 'lax',
    },
}));

app.use((req, res, next) => {
    if (req.session) {
        req.session.touch();
    }
    next();
});

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

BigInt.prototype.toJSON = function () {
    return this.toString();
};


// GET /api/
router.get('/', (req, res) => {
    res.send('QuickMatatu API is running');
});

// POST /api/register
router.post('/register', async (req, res) => {
    const { userType, username, email, password, license, nationalId } = req.body;
    try {
        const query = `
            INSERT INTO users (userType, username, email, password, license_number, id_number)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
            userType,
            username,
            userType === 'commuter' ? email : null,
            password,
            userType === 'driver' ? license : null,
            userType === 'driver' ? nationalId : null,
        ];
        const result = await turso.execute({ sql: query, args: values }); 
        res.json({ message: 'User registered successfully', userId: result.lastInsertRowid.toString() });
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'An error occurred during registration.' });
    }
});

// POST /api/login
router.post('/login', async (req, res) => {
    const { userType, email, id_number, password } = req.body;
    if (!userType || !password || (userType === 'commuter' && !email) || (userType === 'driver' && !id_number)) {
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

// POST /api/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed.' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
    });
});

//mount router at /api
app.use('/api', router);

// Export the app for Vercel, listen only if running locally
if (require.main === module) {
    app.listen(3001, () => console.log('Server running on port 3001'));
}

module.exports = app;