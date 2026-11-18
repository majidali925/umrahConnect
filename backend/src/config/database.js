const mongoose = require('mongoose');
const env = require('./env');

// NoSQL operator injection is prevented at the edge: every request body/query is validated
// with Joi (stripUnknown + strict types), so user input can never become a query operator.
mongoose.set('strictQuery', true);

async function connectDatabase(uri = env.mongoUri) {
  await mongoose.connect(uri, { autoIndex: true });
  if (!env.isTest) console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
