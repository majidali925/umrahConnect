const env = require('./config/env');
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');

async function start() {
  try {
    await connectDatabase();
  } catch (err) {
    console.error(`[db] Could not connect to MongoDB: ${err.message}`);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] UmrahConnect API listening on http://localhost:${env.port}/api/v1 (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => console.error('[server] Unhandled rejection:', reason));
}

start();
