const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();
const allowedOrigin = [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://192.168.43.201:3001/login',
];

// cors setup
app.use(cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json());

// Session configuration
app.use(session({
    secret:'thatgo', 
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true, 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 ,
        sameSite: 'lax',
    },
}));

// Middleware to refresh session on each request
app.use((req, res, next) => {    if (req.session) {
        req.session.touch(); 
    }
    next();
});

// our database  setup
const turso = new createClient({
    url: 'libsql://quickmatatu-v1-kairo.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3MzE3ODUzNzAsImlkIjoiMDE4ODY0Y2QtMDZiNy00ZDRkLTg5YjQtYWVkYTYwZGRhNDE0In0.19JyNGzJzq-7L5QT34Ay4iOMf2Wian10cWInn3LD3ONR4i3vjg99xTERNQ4Sqn5HgwP6C7tHKiADu4UO0OIZDg',
});

//  JSON
BigInt.prototype.toJSON = function () {
    return this.toString();
};

// Middleware to check if the user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'User is not logged in.' });
    }
};

// Route: Register
app.post('/register', async (req, res) => {
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

        const result = await turso.execute(query, values);
        res.json({ message: 'User registered successfully', userId: result.lastInsertRowid });
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'An error occurred during registration. Please try again later.' });
    }
});

// Route: Login
app.post('/login', async (req, res) => {
    const { userType, email, id_number, password } = req.body;

    if (!userType || !password || (userType === 'commuter' && !email) || (userType === 'driver' && !id_number)) {
        return res.status(400).json({
            error: 'Missing required fields. Commuter: email and password. Driver: id_number and password.',
        });
    }

    try {
        let query, values;

        if (userType === 'commuter') {
            query = `SELECT * FROM users WHERE email = ? AND userType = 'commuter'`;
            values = [email];
        } else if (userType === 'driver') {
            query = `SELECT * FROM users WHERE id_number = ? AND userType = 'driver'`;
            values = [id_number];
        } else {
            return res.status(400).json({ error: 'Invalid user type. Must be "commuter" or "driver".' });
        }

        const result = await turso.execute(query, values);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (password !== user.password) {
                return res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });
            }
            req.session.user = {
                id: user.user_id,
                username: user.username,
                userType: user.userType,
            };
            console.log('Session after login:', req.session);
            res.json({ message: 'Login successful', user: req.session.user });
        } else {
            res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });
        }
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'An error occurred during login. Please try again later.' });
    }

});

// Route: Logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'An error occurred during logout. Please try again later.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout successful' });
    });
});

// Start the server
app.listen(3001, () => {
    console.log('Server is running on port 3001');
});
