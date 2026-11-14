import type { Server } from 'http';
import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { ENV } from './config/env';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const startServer = async (): Promise<Server> => {
  await connectDB();

  const server = app.listen(ENV.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${ENV.PORT}`);
    console.log(`📡 Environment: ${ENV.NODE_ENV}`);
    console.log(`🩺 Health check: http://localhost:${ENV.PORT}/api/v1/health`);
  });

  return server;
};

const shutdown = async (server: Server | undefined, signal: string): Promise<void> => {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('⏱️  Shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await disconnectDB();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

let serverRef: Server | undefined;

startServer()
  .then((server) => {
    serverRef = server;
  })
  .catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });

process.on('SIGINT', () => void shutdown(serverRef, 'SIGINT'));
process.on('SIGTERM', () => void shutdown(serverRef, 'SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  void shutdown(serverRef, 'unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  void shutdown(serverRef, 'uncaughtException');
});
