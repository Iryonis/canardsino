import express from "express";
import dotenv from "dotenv";
import rouletteRoutes from "./routes/rouletteRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;

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
  res.json({
    status: "ok",
    service: "game-engine",
    timestamp: Date.now(),
  });
});

// Games routes
app.use("/games/roulette", rouletteRoutes);
// app.use("/games/blackjack", blackjackRoutes); // Future
// app.use("/games/slots", slotsRoutes); // Future
// app.use("/games/poker", pokerRoutes); // Future

// Liste des jeux disponibles
app.get("/games", (req, res) => {
  res.json({
    games: [
      {
        id: "roulette",
        name: "Roulette Européenne",
        status: "active",
        endpoint: "/games/roulette",
      },
      // Futurs jeux...
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

app.listen(PORT, () => {
  console.log(`🎰 Game Engine service listening on port ${PORT}`);
  console.log(`Available games:`);
  console.log(`  🎡 Roulette - /games/roulette`);
  console.log(`\nRoutes:`);
  console.log(`  GET    /games                          - List all games`);
  console.log(`  POST   /games/roulette/bets            - Place roulette bets`);
  console.log(`  POST   /games/roulette/simple-bets     - Place simple bets`);
  console.log(`  POST   /games/roulette/spin            - Spin the wheel`);
  console.log(`  GET    /games/roulette/bets/:userId    - Get current bets`);
  console.log(`  DELETE /games/roulette/bets/:userId    - Cancel bets`);
});
