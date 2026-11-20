const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const routes = require('./routes');
const { connectDatabase } = require('./config/database');
const ApiError = require('./utils/ApiError');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // correct client IPs for rate limiting behind a reverse proxy

/**
 * CORS for one frontend. Non-browser clients (no Origin header) are allowed; browsers only
 * from the listed origins. The admin panel and the marketplace each get their own allow-list,
 * so neither site can call the other's API from a browser.
 */
const corsFor = (origins) =>
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true, // required for the HTTP-only refresh token cookie
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

const marketplaceCors = corsFor(env.clientUrls);
const adminCors = corsFor(env.adminClientUrls);
const isAdminPath = (path) => path === '/api/v1/admin' || path.startsWith('/api/v1/admin/');

app.use(helmet());
app.use((req, res, next) => (isAdminPath(req.path) ? adminCors : marketplaceCors)(req, res, next));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// Make sure the database is connected before any route runs (instant once connected).
// Needed on Vercel, which serves this app without running server.js. The health check
// connects on its own so it can report why a connection fails.
app.use(async (req, _res, next) => {
  if (req.path === '/api/v1/health') return next();
  try {
    await connectDatabase();
    return next();
  } catch (err) {
    console.error('[db] Connection failed:', err.message);
    return next(new ApiError(503, 'Service temporarily unavailable, please try again shortly', { code: 'DATABASE_UNAVAILABLE' }));
  }
});

app.use('/api/v1/admin', require('./routes/admin.routes'));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
