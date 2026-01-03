/**
 * Roulette game page component
 * Main page for playing European roulette with betting interface
 */

"use client";

import { useState, useEffect } from "react";
import RouletteWheel from "@/components/RouletteWheel";
import {
  BettingControls,
  CurrentBets,
  GameHistory,
  GameResult,
  RouletteTable,
  BetInfoPanel,
  SelectedNumbersDisplay,
  BetErrorDisplay,
  type Bet,
} from "@/components/roulette";
import {
  placeSimpleBets,
  spinRoulette,
  getWalletBalance,
  calculatePotentialPayout,
  getRouletteConfig,
  getUserGameHistory,
  type RouletteConfig,
  type GameHistoryEntry,
} from "@/lib/gameApi";

/**
 * Bet type for roulette bets
 */
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

/**
 * Main roulette page component with complete betting interface
 * @returns Roulette game page
 */
export default function RoulettePage() {
  // Wheel state
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);

  // Betting state
  const [bets, setBets] = useState<Bet[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // Game state
  const [balance, setBalance] = useState(0);
  const [result, setResult] = useState<string>("Place at least one bet");
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [betError, setBetError] = useState<string>("");
  const [maxPotentialWin, setMaxPotentialWin] = useState(0);

  // Configuration from backend
  const [config, setConfig] = useState<RouletteConfig | null>(null);

  /**
   * Load roulette configuration and balance on component mount
   */
  useEffect(() => {
    loadConfig();
    loadBalance();
    loadHistory();
  }, []);

  /**
   * Loads the user's game history from the database
   */
  const loadHistory = async () => {
    try {
      const response = await getUserGameHistory(1, 10);
      setHistory(response.history);
    } catch (error) {
      console.error("Failed to load game history:", error);
      // Don't show error to user, just fail silently
    }
  };

  /**
   * Fetches roulette configuration from backend
   */
  const loadConfig = async () => {
    try {
      const rouletteConfig = await getRouletteConfig();
      setConfig(rouletteConfig);
    } catch (error) {
      console.error("Error loading config:", error);
      setError("Error loading roulette configuration");
    }
  };

  /**
   * Fetches user wallet balance
   */
  /**
   * Fetches user wallet balance
   */
  const loadBalance = async () => {
    try {
      const walletData = await getWalletBalance();
      setBalance(walletData.balance);
    } catch (error) {
      console.error("Error loading balance:", error);
      setError("Error loading balance");
    }
  };

  /**
   * Handles the spin button click, places bets and spins the wheel
   */
  /**
   * Handles the spin button click, places bets and spins the wheel
   */
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

  /**
   * Handles the completion of a spin animation and displays results
   * @param gameResult - The result from the game engine
   */
  /**
   * Handles the completion of a spin animation and displays results
   * @param gameResult - The result from the game engine
   */
  const handleSpinComplete = async (gameResult: any) => {
    setMustSpin(false);
    setLoading(false);

    const { spinResult, netResult } = gameResult;

    // Reload history from database instead of updating locally
    await loadHistory();
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

  /**
   * Adds a simple bet (red, black, even, odd, low, high)
   * @param type - Type of simple bet
   * @param label - Display label for the bet
   */
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

  /**
   * Adds a column or dozen bet
   * @param type - Either "column" or "dozen"
   * @param value - The column (1-3) or dozen (1-3) number
   */
  const addNumberBet = async (type: "column" | "dozen", value: number) => {
    const bet: Bet = {
      type,
      numbers: [value],
      amount: betAmount,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${value}`,
    };
    await addBetToList(bet);
  };

  /**
   * Toggles a number in the selected numbers array
   * @param num - Number to toggle
   */
  const toggleNumberSelection = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  /**
   * Creates an advanced bet from selected numbers
   */
  /**
   * Creates an advanced bet from selected numbers
   */
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

    await addBetToList(bet);
    if (!betError) {
      setSelectedNumbers([]);
    }
  };

  /**
   * Adds a bet to the bets list after validation
   * @param bet - Bet to add
   */
  /**
   * Adds a bet to the bets list after validation
   * @param bet - Bet to add
   */
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

  /**
   * Updates the maximum potential win based on current bets
   * @param currentBets - Current array of bets
   */
  /**
   * Updates the maximum potential win based on current bets
   * @param currentBets - Current array of bets
   */
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

  /**
   * Clears all bets and resets the game state
   */
  const clearBets = () => {
    setBets([]);
    setSelectedNumbers([]);
    setResult("");
    setError("");
    setBetError("");
    setMaxPotentialWin(0);
  };

  /**
   * Removes a bet by index
   * @param index - Index of the bet to remove
   */
  const removeBet = (index: number) => {
    const newBets = bets.filter((_, i) => i !== index);
    setBets(newBets);
    updatePotentialWin(newBets);
  };

  // Show loading if config not loaded yet
  if (!config) {
    return (
      <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
        <div className="text-blue-light text-xl">Loading roulette...</div>
      </div>
    );
  }

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
        {/* Wheel at the top */}
        <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-8 mb-8">
          <div className="flex justify-center mb-6">
            <RouletteWheel
              winningNumber={winningNumber}
              isSpinning={mustSpin}
            />
          </div>

          <button
            onClick={handleSpinClick}
            disabled={mustSpin || loading || bets.length === 0}
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
            <GameResult result={result} error={error} />
            <GameHistory
              history={history.map(
                (entry) => entry.rouletteDetails.winningNumber
              )}
              redNumbers={config.redNumbers}
            />
          </div>
        </div>

        {/* Betting panel below */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Bet Amount and Current Bets */}
          <div className="lg:col-span-1">
            <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-6 sticky top-4">
              <BettingControls
                betAmount={betAmount}
                onBetAmountChange={setBetAmount}
              />

              <BetErrorDisplay error={betError} />

              <CurrentBets
                bets={bets}
                multipliers={config.payouts}
                maxPotentialWin={maxPotentialWin}
                onRemoveBet={removeBet}
                onClearAll={clearBets}
              />
            </div>
          </div>

          {/* Middle and right columns - Roulette table */}
          <div className="lg:col-span-2">
            <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-6">
              <BetInfoPanel payouts={config.payouts} />

              <SelectedNumbersDisplay selectedNumbers={selectedNumbers} />

              <RouletteTable
                selectedNumbers={selectedNumbers}
                redNumbers={config.redNumbers}
                onNumberClick={toggleNumberSelection}
                onColumnBet={(column) => addNumberBet("column", column)}
                onDozenBet={(dozen) => addNumberBet("dozen", dozen)}
                onSimpleBet={addSimpleBet}
              />

              {/* Action buttons */}
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
  );
}
