import { Router } from "express";
import {
  placeBets,
  spin,
  createSimpleBets,
  cancelBets,
  getCurrentBets,
  getBalance,
  validateSimpleBet,
  calculatePotentialPayout,
} from "../controllers/rouletteController";

const router = Router();

// Placer des paris
router.post("/bets", placeBets);

// Placer des paris simplifiés (format compatible avec l'ancien frontend)
router.post("/simple-bets", createSimpleBets);

// Tourner la roue
router.post("/spin", spin);

// Annuler les paris
router.delete("/bets/:userId", cancelBets);

// Obtenir les paris actuels
router.get("/bets/:userId", getCurrentBets);

// Obtenir le solde (mock wallet)
router.get("/balance", getBalance);

// Valider un pari simple
router.post("/validate-bet", validateSimpleBet);

// Calculer le gain potentiel total
router.post("/calculate-potential-payout", calculatePotentialPayout);

export default router;
