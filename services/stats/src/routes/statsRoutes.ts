import { Router } from "express";
import { streamStats } from "../controllers/statsController";
import { healthCheck } from "../server";

const router = Router();

// Health check
router.get("/health", healthCheck);

// SSE endpoint
router.get("/stream", streamStats);

export default router;
