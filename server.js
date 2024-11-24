const express = require('express');
const session = require('express-session');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();
const allowedOrigin = [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://192.168.43.201:3001/login',
    'http://localhost:3001',
    'http://192.168.43.201:3001/routes',
    'http://192.168.43.201:3001/get-commuter-id',
    'http://192.168.43.201:3001/book-ticket',
    'http://192.168.43.201:3001/get_user',
    'http://192.168.43.201:3001/user',
    'http://192.168.43.201:3001/get-tickets',
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
        secure: false, 
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
    const { userType, username, email, password,driverName,vehicleLicensePlate, license, nationalId } = req.body;

    try {
        const query = `
            INSERT INTO users(userType, username, name , email,car_plate, password, license_number, id_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            userType,
            username,
            userType === 'driver' ? driverName:null,
            email,
            userType === 'driver' ? vehicleLicensePlate:null,
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
        let userId = null;
        let successful = false;
        if (result.rows.length > 0) {
            const user = result.rows[0];
            userId = user.user_id;

            if (password === user.password) {
                successful = true;
                // Generate the  session token
                const sessionToken = require('crypto').randomBytes(64).toString('hex');
                const createdAt = new Date();
                const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000);

                // Insert session into the database
                const sessionQuery = `
                    INSERT INTO user_sessions (user_id, session_token, created_at, expires_at)
                    VALUES (?, ?, ?, ?)
                `;
                const sessionValues = [userId, sessionToken, createdAt, expiresAt];
                await turso.execute(sessionQuery, sessionValues);

                // Store session
                req.session.user = {
                    id: userId,
                    username: user.username,
                    userType: user.userType,
                    sessionToken,
                };

                console.log('Session after login:', req.session);

                res.json({
                    message: 'Login successful',
                    user: req.session.user,
                    session: { sessionToken, createdAt, expiresAt },
                });
            } else {
                res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });
            }
        } else {
            res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });
        }

// Log the login attempt in our database 
        const attemptQuery = `
            INSERT INTO login_attempts (user_id, attempt_time, successful)
            VALUES (?, ?, ?)
        `;
        const attemptValues = [userId, new Date(), successful];
        await turso.execute(attemptQuery, attemptValues);
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'An error occurred during login. Please try again later.' });
    }
});

//route for getting the username
app.get('/get-user-info', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.status(401).json({ error: 'User is not logged in.' });
    }
});

//routes:routes
app.get('/routes', async (req, res) => {
    try {
        const query = 'SELECT route_id, route_name, start_point, end_point,estimated_duration, longitude, latitude FROM routes';
        const result = await turso.execute(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
});

// Fetch the current users session 
app.get('/get_user', async (req, res) => {
    if (req.session.user ) {
        res.json({ commuterId: req.session.user.id });
    } else {
        res.status(401).json({ error: 'User is not logged in ' });
    }
});

// Route for fetching  user details
app.get('/user', async (req, res) => {
    try {
        const { userid } = req.session;
        if (!userid) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
    
        const userQuery = `SELECT userid, username, role FROM users WHERE userid = ?`;
        const [user] = await db.execute(userQuery, [userid]);
    
        if (user.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
    
        res.json(user[0]); 
      } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

app.get('/user/:commuterId', async (req, res) => {
    try {
        const { commuterId } = req.params;
        const userQuery = `SELECT user_id, username, userType FROM users WHERE user_id = ?`;
        const result = await turso.execute(userQuery, [commuterId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route for booking a ticket
app.post('/book-ticket', async (req, res) => {
    const { commuter_id, matatu_id, route_id, pickup_point, estimated_pickup_time } = req.body;

    if (!commuter_id || !matatu_id || !route_id || !pickup_point || !estimated_pickup_time) {
        return res.status(400).json({ error: 'Missing required fields for booking a ticket.' });
    }
    try {
        const query = `
            INSERT INTO bookings (commuter_id, matatu_id, route_id, pickup_point, estimated_pickup_time)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [commuter_id, matatu_id, route_id, pickup_point, estimated_pickup_time];

        const result = await turso.execute(query, values);
        res.json({ message: 'Ticket booked successfully!', bookingId: result.lastInsertRowid });
    } catch (err) {
        console.error('Database Error:', err.message);
        res.status(500).json({ error: 'An error occurred while booking the ticket. Please try again later.' });
    }
});

// Route for getting the tickets
app.get('/get-tickets', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'User is not logged in.' });
    }
    const commuterId = req.session.user.id; 

    if (!commuterId) {
        return res.status(400).json({ error: 'Commuter ID is required' });
    }
    try {
        const query = `
            SELECT * FROM bookings
            WHERE commuter_id = ?
            ORDER BY estimated_pickup_time DESC
        `;
        const values = [commuterId];

        const result = await turso.execute(query, values);

        if (result.rows.length === 0) {
            return res.json({ message: 'No tickets purchased.' });
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'An error occurred while fetching tickets.' });
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
