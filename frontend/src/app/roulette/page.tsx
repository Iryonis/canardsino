/**
 * Roulette game page component
 * Main page for playing European roulette with betting interface
 */

"use client";

import { useState, useEffect, useRef } from "react";
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
  type SimpleBet,
  type GameResult as GameResultType,
} from "@/lib/gameApi";
import { Navbar } from "@/components/navbar/navbar";
import Fireworks from "react-canvas-confetti/dist/presets/fireworks";

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
  // Display state
  const [display, setDisplay] = useState<boolean>(false);
  // Wheel state
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);

  // Betting state
  const [bets, setBets] = useState<Bet[]>([]);
  const [prevBets, setPrevBets] = useState<Bet[]>([]);
  const [betAmount, _setBetAmount] = useState(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // Game state
  const [balance, setBalance] = useState(0);
  const [result, setResult] = useState<string>(
    "Place your bets and spin the wheel!"
  );
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBets, setLoadingBets] = useState(false);
  const [error, setError] = useState<string>("");
  const [betError, setBetError] = useState<string>("");
  const [maxPotentialWin, setMaxPotentialWin] = useState(0);

  // Fireworks controller
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  const fireworksController = useRef<any>(null);

  // Configuration from backend
  const [config, setConfig] = useState<RouletteConfig | null>(null);

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
   * Load roulette configuration and balance on component mount
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConfig();
    loadBalance();
    loadHistory();
  }, []);

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
    setResult("Spinning the wheel...");

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

      await placeSimpleBets(simpleBets as SimpleBet[]);
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

  const setSameBets = () => {
    if (prevBets.reduce((sum, b) => sum + b.amount, 0) <= balance) {
      setLoadingBets(true);
      setBets(prevBets);
      setResult("Setting the same bets...");
      setTimeout(() => {
        setLoadingBets(false);
        setResult("Your bets are set: spin the wheel!");
      }, 5000);
    }
  };

  /**
   * Handles the completion of a spin animation and displays results
   * @param gameResult - The result from the game engine
   */
  const handleSpinComplete = async (gameResult: GameResultType) => {
    setMustSpin(false);
    setLoading(false);

    const { spinResult, netResult } = gameResult;

    // Reload history from database instead of updating locally
    await loadHistory();
    await loadBalance();

    if (netResult > 0) {
      if (netResult / bets.reduce((sum, bet) => sum + bet.amount, 0) >= 10) {
        // Trigger fireworks
        if (fireworksController.current) {
          fireworksController.current.run({ speed: 3 });
          setTimeout(() => {
            if (fireworksController.current) {
              fireworksController.current.stop();
            }
          }, 5000);
        }
      }

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

    setPrevBets(bets);
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

      const validation = await calculatePotentialPayout([
        simpleBet,
      ] as SimpleBet[]);

      // Check if validation failed (valid: false)
      if (validation.valid === false) {
        setBetError(validation.error || validation.message || "Invalid bet");
        setTimeout(() => setBetError(""), 3000);
        return;
      }

      if (
        bet.amount > balance ||
        bet.amount + bets.reduce((sum, b) => sum + b.amount, 0) > balance
      ) {
        setBetError("Insufficient balance for this bet");
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

      const payoutData = await calculatePotentialPayout(
        simpleBets as SimpleBet[]
      );

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

  const setBetAmount = (amount: number | string) => {
    if (amount === "All-in") {
      console.log(balance);
      _setBetAmount(balance);
    } else {
      const parsedAmount =
        typeof amount === "string" ? parseInt(amount) : amount;
      _setBetAmount(parsedAmount);
    }
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

  if (display) {
    /* Wheel at the top */
    return (
      <div className="min-h-screen bg-blue-darkest">
        <Fireworks
          className="z-50 pointer-events-none fixed top-0 left-0 w-full h-full"
          onInit={({ conductor }) => {
            fireworksController.current = conductor;
          }}
        />
        {/* Header */}
        <Navbar balance={balance} currentPage="European Roulette" />
        <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-8 my-8">
          <div className="flex justify-center mb-6">
            <RouletteWheel
              winningNumber={winningNumber}
              isSpinning={mustSpin}
            />
          </div>

          <GameResult result={result} error={error} />

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              disabled={mustSpin || loading || bets.length !== 0}
              className={`trapezoid_left p-3 border border-blue rounded-lg whitespace-nowrap font-semibold text-lg transition-all duration-5000 active:scale-95 ${
                mustSpin || loading || bets.length === 0
                  ? "flex-1 bg-green-600 text-white"
                  : "bg-gray-600 text-gray-300 cursor-not-allowed"
              }`}
              onClick={() => {
                setDisplay(!display);
              }}
            >
              Place a new bet
            </button>
            <button
              onClick={handleSpinClick}
              disabled={mustSpin || loading || bets.length === 0 || loadingBets}
              className={`p-4 text-lg font-semibold rounded-lg whitespace-nowrap transition-all duration-5000 shadow-md border ${
                mustSpin || loading || bets.length === 0
                  ? "flex-none bg-gray-600 text-gray-300 cursor-not-allowed border-gray-600 shadow-transparent"
                  : "flex-1 bg-green-600 text-white border-green-300 shadow-green-500"
              }`}
            >
              {mustSpin
                ? "Spinning..."
                : bets.length > 0
                ? "Spin the wheel!"
                : "Place your bets"}
            </button>
            <button
              disabled={mustSpin || loading || loadingBets}
              onClick={() => {
                setSameBets();
              }}
              className={`trapezoid_right p-3 border border-blue rounded-lg whitespace-nowrap font-semibold text-lg transition-all duration-5000 ${
                mustSpin || loading || bets.length === 0
                  ? "flex-1 bg-green-600 text-white"
                  : "bg-gray-600 text-gray-300 cursor-not-allowed"
              }`}
            >
              Place the same bet
            </button>
          </div>

          <div className="absolute top-4 right-4 text-center">
            <GameHistory
              history={history.map(
                (entry) => entry.rouletteDetails.winningNumber
              )}
              redNumbers={config.redNumbers}
            />
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="min-h-screen bg-blue-darkest">
        {/* Header */}
        <Navbar balance={balance} currentPage="European Roulette" />

        <div className="container mx-auto px-4 py-8">
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
                    className={`flex-1 py-2 rounded-lg font-semibold text-lg transition ${
                      selectedNumbers.length === 0
                        ? "bg-gray-600 cursor-not-allowed text-gray-400"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    Place Bet ({betAmount} coins)
                  </button>
                  <button
                    onClick={() => setSelectedNumbers([])}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-lg transition"
                  >
                    Clear Selection
                  </button>
                </div>

                <SelectedNumbersDisplay selectedNumbers={selectedNumbers} />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 mt-4">
            <div
              className={`flex bg-blue-dark/30 backdrop-blur border border-blue rounded-lg p-2 transition-all duration-300 shadow-lg shadow-black/50 justify-center ${
                bets.length === 0 ? "" : "group hover:p-0"
              }`}
            >
              <button
                className={`p-2 rounded-lg transition-all duration-300 ${
                  bets.length === 0
                    ? "flex-0 px-6 bg-gray-600 cursor-not-allowed text-gray-400"
                    : "flex-1 group-hover:p-4 bg-green-600 hover:bg-green-500 active:scale-95"
                }`}
                onClick={() => {
                  setDisplay(!display);
                }}
              >
                <span className="text-white font-semibold group-hover:animate-pulse group-hover:text-2xl group-hover:underline transition-all duration-300">
                  Play!
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
