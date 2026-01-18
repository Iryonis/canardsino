import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import walletRoutes from "./routes/walletRoutes.js";

// Load environment variables
dotenv.config();

// Swagger configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Wallet Service API",
      description: "Wallet microservice for CoinCoin Casino - manages CCC tokens, deposits, and transactions",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost/api/wallet",
        description: "Development server (via NGINX)",
      },
      {
        url: "http://localhost:8002/wallet",
        description: "Direct access",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        internalApiKey: {
          type: "apiKey",
          in: "header",
          name: "x-internal-api-key",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();
const PORT = process.env.PORT || 8002;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "casino_wallet";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/wallet", walletRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "wallet" });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(`${MONGO_URL}/${MONGO_DB_NAME}?authSource=admin`);
    console.log(`Connected to MongoDB: ${MONGO_DB_NAME}`);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Wallet service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
