const mongoose = require('mongoose');
const env = require('./env');

// NoSQL operator injection is prevented at the edge: every request body/query is validated
// with Joi (stripUnknown + strict types), so user input can never become a query operator.
mongoose.set('strictQuery', true);

let pending = null;

/**
 * Connects once and reuses the connection. Safe to call on every request: serverless
 * hosts (Vercel) load app.js without running server.js, so the app connects lazily too.
 */
async function connectDatabase(uri = env.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!pending) {
    pending = mongoose
      // Fail fast (default is 30 s) so a bad URI or a blocked IP surfaces as an error, not a timeout.
      .connect(uri, { autoIndex: true, serverSelectionTimeoutMS: 8000 })
      .then(() => {
        if (!env.isTest) console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
        return mongoose.connection;
      })
      .catch((err) => {
        pending = null; // let the next request retry
        throw err;
      });
  }
  return pending;
}

async function disconnectDatabase() {
  pending = null;
  await mongoose.disconnect();
}

/** A short, safe explanation of a connection error for the health check (no hosts or credentials). */
function describeConnectionError(err) {
  const text = `${err?.name} ${err?.message} ${err?.cause?.message || ''}`;
  if (/auth|bad auth|Authentication failed/i.test(text)) return 'Authentication failed: check the user and password in MONGODB_URI';
  if (/whitelist|not allowed|IP address/i.test(text)) return 'This server’s IP is not allowed: check Network Access in MongoDB Atlas';
  if (/ENOTFOUND|querySrv|EAI_AGAIN/i.test(text)) return 'Database host not found: check the host in MONGODB_URI';
  if (/ECONNREFUSED|127\.0\.0\.1|localhost/i.test(text)) return 'Connection refused: MONGODB_URI points to a database this server cannot reach';
  if (/ServerSelection|timed out/i.test(text)) return 'Timed out reaching the database: check MONGODB_URI and Atlas Network Access';
  return 'Could not connect to the database';
}

module.exports = { connectDatabase, disconnectDatabase, describeConnectionError };
