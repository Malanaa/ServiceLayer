const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5500,http://localhost:3000,http://localhost:5173';

const allowedOrigins = FRONTEND_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);

// middleware: allow only configured origins and enable credentials
app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser tools (curl/Postman) which usually don't send origin
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS origin denied'));
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// mount auth routes (focused for now)
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// mount products proxy
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

// mount cart proxy routes (forwards to cart service)
const cartRouter = require('./routes/cart');
app.use('/api/cart', cartRouter);

// mount orders proxy
const ordersRouter = require('./routes/orders');
app.use('/api/orders', ordersRouter);

// mount profile proxy
const profileRouter = require('./routes/profile');
app.use('/api/profile', profileRouter);

// mount admin router
const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

// minimal health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'BFF auth-only server running', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`BFF auth server listening on http://localhost:${PORT} (CORS origin: ${FRONTEND_ORIGIN})`);
});
