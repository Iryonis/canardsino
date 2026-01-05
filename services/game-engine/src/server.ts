import express from "express";
import dotenv from "dotenv";
import rouletteRoutes from "./routes/rouletteRoutes";
import { Database } from "./config/database";

dotenv.config();

const app = express();
const PORT = process.env.GAME_PORT;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Health check
app.get("/health", (req, res) => {
  const db = Database.getInstance();
  const isDbConnected = db.getConnectionStatus();

  const health = {
    status: isDbConnected ? "healthy" : "degraded",
    service: "game-engine",
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    database: {
      connected: isDbConnected,
      type: "MongoDB",
      dbName: process.env.MONGO_DB_NAME || "game_engine_db",
    },
    timestamp: new Date().toISOString(),
  };

  const statusCode = isDbConnected ? 200 : 503;
  res.status(statusCode).json(health);
});

// Games routes
app.use("/games/roulette", rouletteRoutes);

// Available games endpoint
app.get("/games", (req, res) => {
  res.json({
    games: [
      {
        id: "roulette",
        name: "Roulette Européenne",
        status: "active",
        endpoint: "/games/roulette",
      },
    ],
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res
      .status(500)
      .json({ error: "Internal server error", message: err.message });
  }
);

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    const db = Database.getInstance();
    await db.connect();

    app.listen(PORT, () => {
      console.log(`🎰 Game Engine service listening on port ${PORT}`);
      console.log(`Available games:`);
      console.log(`  🎡 Roulette - /games/roulette`);
      console.log(`\nRoutes:`);
      console.log(`  GET    /games                          - List all games`);
      console.log(
        `  POST   /games/roulette/bets            - Place roulette bets`
      );
      console.log(
        `  POST   /games/roulette/simple-bets     - Place simple bets`
      );
      console.log(`  POST   /games/roulette/spin            - Spin the wheel`);
      console.log(
        `  GET    /games/roulette/bets/:userId    - Get current bets`
      );
      console.log(`  DELETE /games/roulette/bets/:userId    - Cancel bets`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Handle graceful shutdown on SIGINT and SIGTERM signals
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`);

  try {
    const db = Database.getInstance();
    await db.disconnect();
    console.log("👋 Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer();
