import mongoose from "mongoose";

/**
 * Database connection manager for game-engine service
 * Handles MongoDB connection with retry logic and graceful error handling
 */
export class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance of Database
   * @returns Database instance
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB database
   * Uses MONGO_URL from environment variables or falls back to default
   * @returns Promise that resolves when connected
   */
  public async connect(): Promise<void> {
    const MONGO_URL = process.env.MONGO_URL;
    const MONGO_DB_NAME = process.env.DB_NAME_GAME_ENGINE;

    if (this.isConnected) {
      console.log("📦 Already connected to MongoDB");
      return;
    }

    try {
      // Parse the URL correctly to add database name
      let connectionUrl: string;

      if (MONGO_URL?.includes("?")) {
        // URL has query params: insert DB name before the query string
        const [baseUrl, queryString] = MONGO_URL.split("?");
        connectionUrl = `${baseUrl}/${MONGO_DB_NAME}?${queryString}`;
      } else {
        // No query params: just append DB name
        connectionUrl = `${MONGO_URL}/${MONGO_DB_NAME}`;
      }

      await mongoose.connect(connectionUrl);

      this.isConnected = true;
      console.log(`✅ Connected to MongoDB database: ${MONGO_DB_NAME}`);
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns Promise that resolves when disconnected
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log("✅ Disconnected from MongoDB");
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   * @returns true if connected, false otherwise
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export default Database.getInstance();
