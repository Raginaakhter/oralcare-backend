import mongoose from 'mongoose';
import dns from 'dns';
import { ENV, isProd } from './env';

// Public DNS resolvers so `mongodb+srv://` SRV lookups succeed even when the
// host's default resolver blocks or drops SRV queries.
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const registerConnectionEvents = (): void => {
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB connection lost');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime error:', err.message);
  });
};

export const connectDB = async (): Promise<void> => {
  registerConnectionEvents();

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ MongoDB Connection Error: ${message}`);
    if (isProd) throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('👋 MongoDB disconnected');
  }
};
