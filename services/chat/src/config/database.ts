import mongoose from 'mongoose';

export class Database {
  static async connect(): Promise<void> {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017?authSource=admin';
    const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'chat_db';

    try {
      // Parse the URL correctly to add database name
      let connectionUrl: string;
      
      if (MONGO_URL.includes('?')) {
        // URL has query params: insert DB name before the query string
        const [baseUrl, queryString] = MONGO_URL.split('?');
        connectionUrl = `${baseUrl}/${MONGO_DB_NAME}?${queryString}`;
      } else {
        // No query params: just append DB name
        connectionUrl = `${MONGO_URL}/${MONGO_DB_NAME}`;
      }
      
      await mongoose.connect(connectionUrl);
      console.log(`✅ Connected to MongoDB database: ${MONGO_DB_NAME}`);
    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
      throw err;
    }
  }

  static async disconnect(): Promise<void> {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}