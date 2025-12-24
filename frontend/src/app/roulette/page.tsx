"use client";

import { useState, useEffect } from "react";
import RouletteWheel from "@/components/RouletteWheel";
import {
  placeSimpleBets,
  spinRoulette,
  getWalletBalance,
  validateSimpleBet,
  calculatePotentialPayout,
  SimpleBet,
} from "@/lib/gameApi";

// Red numbers in European roulette
const redNumbers = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

// Roulette table layout (12 rows x 3 columns)
const rouletteTable = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], // Column 3
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], // Column 2
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], // Column 1
];

type BetType =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "line"
  | "column"
  | "dozen"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high";

interface Bet {
  type: BetType;
  numbers: number[];
  amount: number;
  label: string;
}

export default function RoulettePage() {
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [balance, setBalance] = useState(0);
  const [result, setResult] = useState<string>("Place at least one bet");
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [betError, setBetError] = useState<string>("");
  const [maxPotentialWin, setMaxPotentialWin] = useState(0);

  // Advanced betting states
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // Load balance on startup
  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const walletData = await getWalletBalance();
      setBalance(walletData.balance);
    } catch (error) {
      console.error("Error loading balance:", error);
      setError("Error loading balance");
    }
  };

  const handleSpinClick = async () => {
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
    if (totalBet > balance) {
      setResult("Insufficient balance!");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      // Convert bets to backend format
      const simpleBets = bets.map((bet) => {
        // For simple bets (red, black, etc.) - no value
        if (bet.numbers.length === 0) {
          return {
            type: bet.type,
            amount: bet.amount,
          };
        }
        // For column/dozen bets - value is the number
        if (bet.type === "column" || bet.type === "dozen") {
          return {
            type: bet.type,
            value: bet.numbers[0],
            amount: bet.amount,
          };
        }
        // For complex numeric bets - send numbers directly
        return {
          type: bet.type,
          numbers: bet.numbers,
          amount: bet.amount,
        };
      });

      await placeSimpleBets(simpleBets as any);
      const spinResponse = await spinRoulette();
      const gameResult = spinResponse.result;

      setWinningNumber(gameResult.spinResult.winningNumber);
      setMustSpin(true);

      setTimeout(() => {
        handleSpinComplete(gameResult);
      }, 5000);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : "Error during spin";
      setError(errorMessage);
      setResult(errorMessage);
    }
  };

  const handleSpinComplete = async (gameResult: any) => {
    setMustSpin(false);
    setLoading(false);

    const { spinResult, netResult } = gameResult;

    setHistory([spinResult.winningNumber, ...history.slice(0, 9)]);
    await loadBalance();

    if (netResult > 0) {
      setResult(
        `You WON ${netResult} coins! The number was ${spinResult.winningNumber} (${spinResult.color})`
      );
    } else if (netResult === 0) {
      setResult(
        `Refunded! The number was ${spinResult.winningNumber} (${spinResult.color})`
      );
    } else {
      setResult(
        `You LOST ${Math.abs(netResult)} coins. The number was ${
          spinResult.winningNumber
        } (${spinResult.color})`
      );
    }

    setBets([]);
    setSelectedNumbers([]);
  };

  const getMultiplier = (type: BetType): number => {
    const multipliers: Record<BetType, number> = {
      straight: 35,
      split: 17,
      street: 11,
      corner: 8,
      line: 5,
      column: 2,
      dozen: 2,
      red: 1,
      black: 1,
      even: 1,
      odd: 1,
      low: 1,
      high: 1,
    };
    return multipliers[type];
  };

  const addSimpleBet = async (
    type: "red" | "black" | "even" | "odd" | "low" | "high",
    label: string
  ) => {
    const bet: Bet = {
      type,
      numbers: [],
      amount: betAmount,
      label,
    };
    await addBetToList(bet);
  };

  const addNumberBet = async (type: "column" | "dozen", value: number) => {
    const bet: Bet = {
      type,
      numbers: [value],
      amount: betAmount,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${value}`,
    };
    await addBetToList(bet);
  };

  const toggleNumberSelection = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const addAdvancedBet = async () => {
    if (selectedNumbers.length === 0) {
      setBetError("Select at least one number");
      setTimeout(() => setBetError(""), 3000);
      return;
    }

    let type: BetType;
    let label: string;

    switch (selectedNumbers.length) {
      case 1:
        type = "straight";
        label = `Straight: ${selectedNumbers[0]}`;
        break;
      case 2:
        type = "split";
        label = `Split: ${selectedNumbers.join("-")}`;
        break;
      case 3:
        type = "street";
        label = `Street: ${selectedNumbers.join("-")}`;
        break;
      case 4:
        type = "corner";
        label = `Corner: ${selectedNumbers.join("-")}`;
        break;
      case 6:
        type = "line";
        label = `Line: ${selectedNumbers.join("-")}`;
        break;
      default:
        setBetError(
          `Cannot create a bet with ${selectedNumbers.length} numbers`
        );
        setTimeout(() => setBetError(""), 3000);
        return;
    }

    const bet: Bet = {
      type,
      numbers: [...selectedNumbers].sort((a, b) => a - b),
      amount: betAmount,
      label,
    };

    // Validation is now handled by addBetToList
    await addBetToList(bet);
    // Reset only if bet was added successfully
    if (!betError) {
      setSelectedNumbers([]);
    }
  };

  const addBetToList = async (bet: Bet) => {
    try {
      // Amount validation
      if (bet.amount <= 0) {
        setBetError("Bet amount must be positive");
        setTimeout(() => setBetError(""), 3000);
        return;
      }

      // Validate bet with backend before adding
      const simpleBet =
        bet.numbers.length === 0
          ? { type: bet.type, amount: bet.amount }
          : bet.type === "column" || bet.type === "dozen"
          ? { type: bet.type, value: bet.numbers[0], amount: bet.amount }
          : { type: bet.type, numbers: bet.numbers, amount: bet.amount };

      const validation = await calculatePotentialPayout([simpleBet] as any);

      // Check if validation failed (valid: false)
      if (validation.valid === false) {
        setBetError(validation.error || validation.message || "Invalid bet");
        setTimeout(() => setBetError(""), 3000);
        return;
      }

      // If validation succeeds, add the bet
      const newBets = [...bets, bet];
      setBets(newBets);
      await updatePotentialWin(newBets);
    } catch (error) {
      console.error("Error adding bet:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Invalid bet";
      setBetError(errorMessage);
      setTimeout(() => setBetError(""), 3000);
    }
  };

  const updatePotentialWin = async (currentBets: Bet[]) => {
    if (currentBets.length === 0) {
      setMaxPotentialWin(0);
      return;
    }

    try {
      const simpleBets = currentBets.map((bet) =>
        bet.numbers.length === 0
          ? { type: bet.type, amount: bet.amount }
          : bet.type === "column" || bet.type === "dozen"
          ? { type: bet.type, value: bet.numbers[0], amount: bet.amount }
          : { type: bet.type, numbers: bet.numbers, amount: bet.amount }
      );

      const payoutData = await calculatePotentialPayout(simpleBets as any);

      // If validation fails, don't update potential win
      if (payoutData.valid === false) {
        return;
      }

      setMaxPotentialWin(payoutData.maxPotentialWin || 0);
    } catch (error) {
      console.error("Error calculating potential win:", error);
    }
  };

  const clearBets = () => {
    setBets([]);
    setSelectedNumbers([]);
    setResult("");
    setError("");
    setBetError("");
    setMaxPotentialWin(0);
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
            <span className="ml-4 text-blue-light">- European Roulette</span>
          </div>
          <div className="text-blue-lightest font-bold text-xl">
            💰 Balance: {balance} coins
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Roue en haut */}
        <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-8 mb-8">
          <div className="flex justify-center mb-6">
            <RouletteWheel
              winningNumber={winningNumber}
              isSpinning={mustSpin}
            />
          </div>

          <button
            onClick={handleSpinClick}
            disabled={mustSpin || loading}
            className={`w-full max-w-md mx-auto block py-4 text-lg font-bold rounded-lg transition ${
              mustSpin || loading || bets.length === 0
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-blue-darkest"
            }`}
          >
            {loading
              ? "Processing..."
              : mustSpin
              ? "Spinning..."
              : "SPIN the wheel!"}
          </button>

          <div className="absolute top-4 right-4 text-center">
            {error && (
              <div className="mt-4 max-w-md mx-auto p-4 rounded-lg text-center font-bold bg-red-500/20 text-red-400">
                {error}
              </div>
            )}

            {result && !error && (
              <div
                className={`mt-4 max-w-md mx-auto p-4 rounded-lg text-center font-bold ${
                  result.toLowerCase().includes("won")
                    ? "bg-green-500/20 text-green-400"
                    : result.toLowerCase().includes("lost")
                    ? "bg-red-500/20 text-red-400"
                    : "bg-blue/20 text-blue-light"
                }`}
              >
                {result}
              </div>
            )}

            {/* Historique */}
            {
              <div className="mt-6 min-w-md max-w-3xl mx-auto border border-blue p-4 rounded-lg bg-blue-dark/50">
                <h3 className="text-blue-light font-semibold mb-2 text-center">
                  History:
                </h3>
                <div className="flex min-h-20 flex-wrap gap-2">
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
            }
          </div>
        </div>

        {/* Panneau de paris en dessous */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne de gauche - Bet Amount et Current Bets */}
          <div className="lg:col-span-1">
            <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-6 sticky top-4">
              {/* Bet Amount */}
              <div className="border border-blue-light p-4 rounded-lg mb-6 bg-blue-dark/50">
                <div className="mb-4">
                  <label className="block text-blue-light mb-2 font-semibold">
                    Bet amount:
                  </label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) =>
                      setBetAmount(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 bg-blue-dark border border-blue text-blue-lightest rounded-lg focus:outline-none focus:border-blue-light"
                    min="1"
                  />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[10, 25, 50, 100].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setBetAmount(amount)}
                        className="py-2 bg-blue-dark hover:bg-blue border border-blue text-blue-lightest rounded text-sm transition"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bet Error */}
              {betError && (
                <div className="mb-4 p-3 rounded-lg text-center text-sm font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                  ⚠️ {betError}
                </div>
              )}

              {/* Current Bets */}
              {bets.length > 0 && (
                <div className="border border-blue-light p-4 rounded-lg bg-blue-dark/50">
                  <h3 className="text-blue-light font-semibold mb-2">
                    Current Bets:
                  </h3>
                  <div className="bg-blue-dark/50 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
                    {bets.map((bet, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 bg-blue-dark/50 p-2 rounded"
                      >
                        <div className="flex-1">
                          <div className="text-blue-lightest text-sm font-medium">
                            {bet.label}
                          </div>
                          <div className="text-blue-light text-xs">
                            {bet.amount} coins × {getMultiplier(bet.type) + 1} ={" "}
                            {bet.amount * (getMultiplier(bet.type) + 1)} coins
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newBets = bets.filter((_, i) => i !== idx);
                            setBets(newBets);
                            updatePotentialWin(newBets);
                          }}
                          className="px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white rounded text-xs transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-blue pt-2 space-y-1">
                      <div className="flex justify-between text-sm font-bold text-blue-light">
                        <span>Total Bet:</span>
                        <span>
                          {bets.reduce((sum, bet) => sum + bet.amount, 0)} coins
                        </span>
                      </div>
                      {maxPotentialWin > 0 && (
                        <div className="flex justify-between text-sm font-bold text-green-400">
                          <span>Max Potential Win:</span>
                          <span>+{maxPotentialWin} coins</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={clearBets}
                    className="w-full mt-2 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold transition"
                  >
                    Clear All Bets
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Colonnes du milieu et droite - Table de roulette */}
          <div className="lg:col-span-2">
            <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-6">
              {/* Bet pannel */}

              <div>
                <div className="mb-4 p-3 bg-blue-dark/70 rounded-lg block">
                  <div className="grid grid-cols-2 text-xs text-blue-light">
                    {[
                      { label: "1 number", name: "Straight", multiplier: 35 },

                      {
                        label: "12 numbers in a row",
                        name: "Dozen",
                        multiplier: 2,
                      },
                      { label: "2 adjacent", name: "Split", multiplier: 17 },

                      {
                        label: "12 numbers in a column",
                        name: "Column",
                        multiplier: 2,
                      },
                      {
                        label: "3 in a row (not column)",
                        name: "Street",
                        multiplier: 11,
                      },

                      {
                        label: "18 numbers (all red)",
                        name: "Red",
                        multiplier: 1,
                      },
                      { label: "4 in a square", name: "Corner", multiplier: 8 },

                      {
                        label: "18 numbers (all black)",
                        name: "Black",
                        multiplier: 1,
                      },
                      {
                        label: "6 numbers (two adjacent streets)",
                        name: "Line",
                        multiplier: 5,
                      },
                      {
                        label: "18 numbers (all even)",
                        name: "Even",
                        multiplier: 1,
                      },
                      {
                        label: "18 numbers (all odd)",
                        name: "Odd",
                        multiplier: 1,
                      },
                      {
                        label: "18 numbers (1-18)",
                        name: "1-18",
                        multiplier: 1,
                      },
                      {
                        label: "18 numbers (19-36)",
                        name: "19-36",
                        multiplier: 1,
                      },
                    ].map((bet) => (
                      <p key={bet.name}>
                        <span className="font-bold">{bet.label}</span>:{" "}
                        {bet.name} (×{bet.multiplier + 1})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                {selectedNumbers.length > 0 && (
                  <div className="mb-4 p-3 bg-blue/20 rounded-lg">
                    <div className="text-sm text-blue-lightest font-semibold">
                      Selected: {selectedNumbers.join(", ")} (
                      {selectedNumbers.length} number
                      {selectedNumbers.length > 1 ? "s" : ""})
                    </div>
                  </div>
                )}

                {/* Table de roulette européenne */}
                <div className="bg-blue/50 p-4 rounded-lg border border-blue-lightest">
                  <div className="flex gap-2">
                    {/* Zéro à gauche */}
                    <div className="flex flex-col justify-center">
                      <button
                        onClick={() => toggleNumberSelection(0)}
                        className={`w-12 h-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded transition ${
                          selectedNumbers.includes(0)
                            ? "ring-4 ring-yellow-400"
                            : ""
                        }`}
                      >
                        0
                      </button>
                    </div>

                    {/* Grille principale (3 rangées x 12 colonnes) */}
                    <div className="flex-1">
                      {/* Rangées */}
                      {rouletteTable.map((row, rowIdx) => (
                        <div key={rowIdx} className="flex gap-1 mb-1 last:mb-0">
                          {row.map((num) => (
                            <button
                              key={num}
                              onClick={() => toggleNumberSelection(num)}
                              className={`flex-1 h-14 font-bold text-white text-lg rounded transition ${
                                selectedNumbers.includes(num)
                                  ? "ring-4 ring-yellow-400"
                                  : ""
                              } ${
                                redNumbers.includes(num)
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-gray-900 hover:bg-black"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            onClick={() => addNumberBet("column", rowIdx + 1)}
                            className="flex-1 ml-4 py-4 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
                          >
                            Col{rowIdx + 1}
                          </button>
                        </div>
                      ))}

                      {/* Boutons de colonnes */}
                      <div className="flex gap-1 mt-4">
                        {[1, 2, 3].map((doz) => (
                          <button
                            key={doz}
                            onClick={() => addNumberBet("dozen", doz)}
                            className="flex-1 py-4 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
                          >
                            {doz === 1
                              ? "1 to 12"
                              : doz === 2
                              ? "13 to 24"
                              : "25 to 36"}
                          </button>
                        ))}
                      </div>
                      {/* Autres boutons */}
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => addSimpleBet("low", "1-18")}
                          className="flex-1 py-4 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
                        >
                          1-18
                        </button>
                        <button
                          onClick={() => addSimpleBet("even", "Even")}
                          className="flex-1 py-4 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
                        >
                          Even
                        </button>
                        <button
                          onClick={() => addSimpleBet("red", "Red")}
                          className="flex-1 py-4 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold transition"
                        >
                          Red
                        </button>
                        <button
                          onClick={() => addSimpleBet("black", "Black")}
                          className="flex-1 py-4 bg-gray-900 hover:bg-black text-white rounded-lg font-bold transition"
                        >
                          Black
                        </button>
                        <button
                          onClick={() => addSimpleBet("odd", "Odd")}
                          className="flex-1 py-4 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
                        >
                          Odd
                        </button>
                        <button
                          onClick={() => addSimpleBet("high", "19-36")}
                          className="flex-1 py-4 bg-blue-light hover:bg-blue-lightest text-blue-dark rounded-lg font-bold transition"
                        >
                          19-36
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={addAdvancedBet}
                    disabled={selectedNumbers.length === 0}
                    className={`flex-1 py-2 rounded-lg font-bold text-lg transition ${
                      selectedNumbers.length === 0
                        ? "bg-gray-600 cursor-not-allowed text-gray-400"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    Place Bet ({betAmount} coins)
                  </button>
                  <button
                    onClick={() => setSelectedNumbers([])}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
