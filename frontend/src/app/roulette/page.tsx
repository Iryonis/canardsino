"use client";

import { useState } from "react";
import RouletteWheel from "@/components/RouletteWheel";

// Numéros rouges dans la roulette européenne
const redNumbers = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

type BetType = "color" | "parity" | "range" | "number";

interface Bet {
  type: BetType;
  value: string;
  amount: number;
}

export default function RoulettePage() {
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [balance, setBalance] = useState(1000);
  const [result, setResult] = useState<string>("");
  const [history, setHistory] = useState<number[]>([]);

  const handleSpinClick = () => {
    if (bets.length === 0) {
      setResult("Placez au moins un pari !");
      return;
    }

    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    if (totalBet > balance) {
      setResult("Solde insuffisant !");
      return;
    }

    const newWinningNumber = Math.floor(Math.random() * 37); // 0-36
    setWinningNumber(newWinningNumber);
    setMustSpin(true);
    setResult("");
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    if (winningNumber === null) return;

    setHistory([winningNumber, ...history.slice(0, 9)]);

    // Calcul des gains
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    let totalWin = 0;

    bets.forEach((bet) => {
      if (isBetWinning(bet, winningNumber)) {
        totalWin += bet.amount * getMultiplier(bet);
      }
    });

    const netResult = totalWin - totalBet;
    setBalance(balance + netResult);

    if (netResult > 0) {
      setResult(`🎉 Gagné ${netResult} coins ! Le numéro est ${winningNumber}`);
    } else if (netResult === 0) {
      setResult(`💰 Remboursé ! Le numéro est ${winningNumber}`);
    } else {
      setResult(
        `❌ Perdu ${Math.abs(netResult)} coins. Le numéro est ${winningNumber}`
      );
    }

    setBets([]);
  };

  // Calculer le multiplicateur pour un pari donné
  const getMultiplier = (bet: Bet): number => {
    switch (bet.type) {
      case "color":
        return bet.value === "vert" ? 36 : 2;
      case "parity":
        return 2;
      case "range":
        return 2;
      case "number":
        return 36;
      default:
        return 0;
    }
  };

  // Calculer le gain brut d'un pari (montant total gagné si le pari est gagnant)
  const getBetPayout = (bet: Bet): number => {
    const multiplier = getMultiplier(bet);
    return bet.amount * multiplier;
  };

  // Calculer le meilleur gain net possible pour un scénario donné
  // On simule chaque numéro possible et on trouve le meilleur résultat
  const getBestPotentialGain = (): number => {
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    let bestGain = -totalBet; // Au pire, on perd tout

    // Tester tous les numéros possibles (0-36)
    for (let num = 0; num <= 36; num++) {
      let winnings = 0;
      bets.forEach((bet) => {
        if (isBetWinning(bet, num)) {
          winnings += getBetPayout(bet);
        }
      });
      const netGain = winnings - totalBet;
      if (netGain > bestGain) {
        bestGain = netGain;
      }
    }

    return bestGain;
  };

  // Vérifier si un pari est gagnant pour un numéro donné
  const isBetWinning = (bet: Bet, number: number): boolean => {
    switch (bet.type) {
      case "color":
        if (bet.value === "rouge") return redNumbers.includes(number);
        if (bet.value === "noir")
          return !redNumbers.includes(number) && number !== 0;
        if (bet.value === "vert") return number === 0;
        return false;
      case "parity":
        if (bet.value === "pair") return number !== 0 && number % 2 === 0;
        if (bet.value === "impair") return number % 2 === 1;
        return false;
      case "range":
        if (bet.value === "1-18") return number >= 1 && number <= 18;
        if (bet.value === "19-36") return number >= 19 && number <= 36;
        return false;
      case "number":
        return bet.value === number.toString();
      default:
        return false;
    }
  };

  // Formater le nom du pari pour l'affichage
  const getBetLabel = (bet: Bet): string => {
    switch (bet.type) {
      case "color":
        return `Couleur: ${bet.value}`;
      case "parity":
        return bet.value.charAt(0).toUpperCase() + bet.value.slice(1);
      case "range":
        return `Plage: ${bet.value}`;
      case "number":
        return `Numéro: ${bet.value}`;
      default:
        return "";
    }
  };

  const addBet = (type: BetType, value: string) => {
    if (betAmount <= 0) return;

    // Vérifier si ce pari existe déjà
    const existingBet = bets.find(
      (bet) => bet.type === type && bet.value === value
    );
    if (existingBet) {
      // Augmenter le montant du pari existant
      setBets(
        bets.map((bet) =>
          bet.type === type && bet.value === value
            ? { ...bet, amount: bet.amount + betAmount }
            : bet
        )
      );
    } else {
      // Ajouter un nouveau pari
      setBets([...bets, { type, value, amount: betAmount }]);
    }
  };

  const clearBets = () => {
    setBets([]);
    setResult("");
  };

  return (
    <div className="min-h-screen bg-blue-darkest">
      {/* Header */}
      <nav className="bg-blue-dark/50 backdrop-blur border-b border-blue">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <a
              href="/"
              className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-light to-blue-lightest"
            >
              🎰 CoinCoin Casino
            </a>
            <span className="ml-4 text-blue-light">- Roulette Européenne</span>
          </div>
          <div className="text-blue-lightest font-bold text-xl">
            💰 Solde: {balance} coins
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Section Roulette (gauche) */}
          <div className="flex flex-col items-center">
            <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-8 w-full">
              <h2 className="text-2xl font-bold text-blue-lightest mb-6 text-center">
                🎡 Roulette
              </h2>

              <div className="flex justify-center mb-6">
                <RouletteWheel
                  winningNumber={winningNumber}
                  isSpinning={mustSpin}
                  onSpinEnd={handleStopSpinning}
                />
              </div>

              <button
                onClick={handleSpinClick}
                disabled={mustSpin}
                className={`w-full py-4 text-lg font-bold rounded-lg transition ${
                  mustSpin
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-blue-darkest"
                }`}
              >
                {mustSpin ? "🎡 En rotation..." : "🎰 LANCER LA ROULETTE"}
              </button>

              {result && (
                <div
                  className={`mt-4 p-4 rounded-lg text-center font-bold ${
                    result.includes("Gagné")
                      ? "bg-green-500/20 text-green-400"
                      : result.includes("Perdu")
                      ? "bg-red-500/20 text-red-400"
                      : "bg-blue/20 text-blue-light"
                  }`}
                >
                  {result}
                </div>
              )}

              {/* Historique */}
              {history.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-blue-light font-semibold mb-2">
                    Historique:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {history.map((num, idx) => (
                      <div
                        key={idx}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          num === 0
                            ? "bg-green-500"
                            : redNumbers.includes(num)
                            ? "bg-red-500"
                            : "bg-gray-800"
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panneau de paris (droite) */}
          <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-6">
            <h2 className="text-2xl font-bold text-blue-lightest mb-6">
              💰 Panneau de Paris
            </h2>

            {/* Montant du pari */}
            <div className="mb-6">
              <label className="block text-blue-light mb-2 font-semibold">
                Montant du pari:
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-blue-dark border border-blue text-blue-lightest rounded-lg focus:outline-none focus:border-blue-light"
                min="1"
              />
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    className="flex-1 py-1 bg-blue-dark hover:bg-blue border border-blue text-blue-lightest rounded text-sm transition"
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste des paris actuels */}
            {bets.length > 0 && (
              <div className="mb-4">
                <h3 className="text-blue-light font-semibold mb-2">
                  Paris actuels:
                </h3>
                <div className="bg-blue-dark/50 rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                  {bets.map((bet, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-blue-dark/50 p-2 rounded"
                    >
                      <div className="flex-1">
                        <div className="text-blue-lightest text-sm font-medium">
                          {getBetLabel(bet)}
                        </div>
                        <div className="text-blue-light text-xs">
                          Mise: {bet.amount} coins (x{getMultiplier(bet)})
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setBets(bets.filter((_, i) => i !== idx))
                        }
                        className="px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white rounded text-xs transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-blue pt-2 space-y-1">
                    <div className="flex justify-between text-sm font-bold text-blue-light">
                      <span>Total misé:</span>
                      <span>
                        {bets.reduce((sum, bet) => sum + bet.amount, 0)} coins
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-green-400">
                      <span>Meilleur gain possible:</span>
                      <span>
                        {getBestPotentialGain() >= 0 ? "+" : ""}
                        {getBestPotentialGain()} coins
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={clearBets}
                  className="w-full mt-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
                >
                  🗑️ Effacer tous les paris
                </button>
              </div>
            )}

            {/* Paris sur couleur */}
            <div className="mb-6">
              <h3 className="text-blue-light font-semibold mb-3">Couleur:</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => addBet("color", "rouge")}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
                >
                  🔴 Rouge (x2)
                </button>
                <button
                  onClick={() => addBet("color", "noir")}
                  className="py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold transition"
                >
                  ⚫ Noir (x2)
                </button>
                <button
                  onClick={() => addBet("color", "vert")}
                  className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition"
                >
                  🟢 Vert (x36)
                </button>
              </div>
            </div>

            {/* Paris pair/impair */}
            <div className="mb-6">
              <h3 className="text-blue-light font-semibold mb-3">Parité:</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addBet("parity", "pair")}
                  className="py-3 bg-blue hover:bg-blue-light text-blue-lightest rounded-lg font-bold transition"
                >
                  Pair (x2)
                </button>
                <button
                  onClick={() => addBet("parity", "impair")}
                  className="py-3 bg-blue hover:bg-blue-light text-blue-lightest rounded-lg font-bold transition"
                >
                  Impair (x2)
                </button>
              </div>
            </div>

            {/* Paris plage */}
            <div className="mb-6">
              <h3 className="text-blue-light font-semibold mb-3">Plage:</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addBet("range", "1-18")}
                  className="py-3 bg-blue hover:bg-blue-light text-blue-lightest rounded-lg font-bold transition"
                >
                  1-18 (x2)
                </button>
                <button
                  onClick={() => addBet("range", "19-36")}
                  className="py-3 bg-blue hover:bg-blue-light text-blue-lightest rounded-lg font-bold transition"
                >
                  19-36 (x2)
                </button>
              </div>
            </div>

            {/* Pari sur numéro spécifique */}
            <div className="mb-6">
              <h3 className="text-blue-light font-semibold mb-3">
                Numéro unique (x36):
              </h3>
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 37 }, (_, i) => i).map((num) => (
                  <button
                    key={num}
                    onClick={() => addBet("number", num.toString())}
                    className={`py-2 rounded font-bold text-white text-sm transition ${
                      num === 0
                        ? "bg-green-600 hover:bg-green-700"
                        : redNumbers.includes(num)
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-gray-800 hover:bg-gray-900"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
