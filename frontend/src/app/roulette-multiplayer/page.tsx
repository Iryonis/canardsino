/**
 * Multiplayer Roulette game page component
 * Real-time multiplayer roulette with WebSocket synchronization
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import RouletteWheel from "@/components/RouletteWheel";
import {
  BettingControls,
  RouletteTable,
  BetInfoPanel,
  SelectedNumbersDisplay,
  BetErrorDisplay,
} from "@/components/roulette";
import { Navbar } from "@/components/navbar/navbar";
import { getRouletteConfig, type RouletteConfig } from "@/lib/gameApi";
import {
  RouletteMultiplayerProvider,
  useRouletteMultiplayer,
  type Bet,
} from "@/contexts/RouletteMultiplayerContext";

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
 * Format time remaining as MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get phase display text and color
 */
function getPhaseDisplay(
  phase: string,
  triggeredBy?: { username: string } | null
): { text: string; subtext?: string; color: string } {
  switch (phase) {
    case "waiting":
      return {
        text: "Waiting for Bets",
        subtext: "Place a bet to start the countdown!",
        color: "text-blue-light",
      };
    case "betting":
      return {
        text: "Place Your Bets!",
        subtext: triggeredBy ? `Started by ${triggeredBy.username}` : undefined,
        color: "text-green-400",
      };
    case "spinning":
      return { text: "No More Bets!", color: "text-yellow-400" };
    case "results":
      return { text: "Results", color: "text-blue-light" };
    default:
      return { text: phase, color: "text-blue-light" };
  }
}

/**
 * Players list component showing all connected players
 */
function PlayersList() {
  const { state } = useRouletteMultiplayer();

  return (
    <div className="bg-blue-dark/30 border border-blue rounded-lg p-4">
      <h3 className="text-blue-light font-semibold mb-2 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Players ({state.playerCount})
      </h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {state.players.map((player) => (
          <div
            key={player.userId}
            className={`flex items-center justify-between text-sm p-2 rounded ${
              player.isConnected
                ? "bg-blue-dark/50"
                : "bg-gray-700/50 opacity-60"
            }`}
          >
            <span className="text-blue-lightest truncate">
              {player.username}
            </span>
            <span className="text-blue-light">
              {player.totalBet > 0 ? `${player.totalBet} CCC` : "-"}
              {player.isLocked ? " 🔒" : ""}
            </span>
          </div>
        ))}
        {state.players.length === 0 && (
          <p className="text-blue-light/60 text-sm">No players yet</p>
        )}
      </div>
    </div>
  );
}

/**
 * Current bets display for multiplayer
 */
function MultiplayerCurrentBets({
  multipliers,
  betLocked = false,
}: {
  multipliers: Record<string, number>;
  betLocked?: boolean;
}) {
  const { state, removeBet, clearBets } = useRouletteMultiplayer();

  if (state.yourBets.length === 0) return null;

  const totalBet = state.yourTotalBet;

  // Calculate max potential payout
  const maxPotentialPayout = state.yourBets.reduce((sum, bet) => {
    const multiplier = multipliers[bet.type] || 1;
    return sum + bet.amount * multiplier;
  }, 0);

  return (
    <div className="border border-blue-light p-4 rounded-lg bg-blue-dark/50">
      <h3 className="text-blue-light font-semibold mb-2">Your Bets:</h3>
      <div className="bg-blue-dark/50 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
        {state.yourBets.map((bet, idx) => {
          const multiplier = multipliers[bet.type] || 1;
          const potentialPayout = bet.amount * multiplier;
          const label = getBetLabel(bet);

          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 bg-blue-dark/50 p-2 rounded"
            >
              <div className="flex-1">
                <div className="text-blue-lightest text-sm font-medium">
                  {label}
                </div>
                <div className="text-blue-light text-xs">
                  {bet.amount} x {multiplier} = {potentialPayout} CCC
                </div>
              </div>
              {state.canBet && !betLocked && (
                <button
                  onClick={() => removeBet(idx)}
                  className="px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white rounded text-xs transition"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        <div className="border-t border-blue pt-2 space-y-1">
          <div className="flex justify-between text-sm font-bold text-blue-light">
            <span>Total Bet:</span>
            <span>{totalBet} CCC</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-green-400">
            <span>Max Payout:</span>
            <span>{maxPotentialPayout} CCC</span>
          </div>
        </div>
      </div>
      {state.canBet && !betLocked && (
        <button
          onClick={clearBets}
          className="w-full mt-2 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold transition"
        >
          Clear All Bets
        </button>
      )}
    </div>
  );
}

/**
 * Get display label for a bet
 */
function getBetLabel(bet: Bet): string {
  switch (bet.type) {
    case "straight":
      return `Straight: ${bet.numbers[0]}`;
    case "split":
      return `Split: ${bet.numbers.join("-")}`;
    case "street":
      return `Street: ${bet.numbers.join("-")}`;
    case "corner":
      return `Corner: ${bet.numbers.join("-")}`;
    case "line":
      return `Line: ${bet.numbers.join("-")}`;
    case "column":
      return `Column ${bet.numbers[0]}`;
    case "dozen":
      return `Dozen ${bet.numbers[0]}`;
    case "red":
      return "Red";
    case "black":
      return "Black";
    case "even":
      return "Even";
    case "odd":
      return "Odd";
    case "low":
      return "Low (1-18)";
    case "high":
      return "High (19-36)";
    default:
      return bet.type;
  }
}

/**
 * Results panel showing spin results
 */
function ResultsPanel() {
  const { state } = useRouletteMultiplayer();

  if (state.phase !== "results" || !state.spinResult) return null;

  const { spinResult, yourResult, allPlayerResults } = state;

  return (
    <div className="bg-blue-dark/50 border border-blue-light rounded-lg p-4 space-y-4">
      <div className="text-center">
        <div className="text-2xl font-bold mb-2">
          <span
            className={
              spinResult.color === "red"
                ? "text-red-500"
                : spinResult.color === "black"
                ? "text-gray-300"
                : "text-green-500"
            }
          >
            {spinResult.winningNumber}
          </span>
          <span className="text-blue-light ml-2 text-lg">
            ({spinResult.color})
          </span>
        </div>
      </div>

      {yourResult && (
        <div
          className={`text-center p-3 rounded-lg ${
            yourResult.netResult > 0
              ? "bg-green-600/30 border border-green-500"
              : yourResult.netResult < 0
              ? "bg-red-600/30 border border-red-500"
              : "bg-blue-dark/30 border border-blue"
          }`}
        >
          <div className="text-lg font-bold">
            {yourResult.netResult > 0 ? (
              <span className="text-green-400">
                +{yourResult.totalWin} CCC Won!
              </span>
            ) : yourResult.netResult < 0 ? (
              <span className="text-red-400">
                -{Math.abs(yourResult.netResult)} CCC Lost
              </span>
            ) : (
              <span className="text-blue-light">No bet placed</span>
            )}
          </div>
          {yourResult.winningBets.length > 0 && (
            <div className="text-sm text-blue-light mt-1">
              {yourResult.winningBets.length} winning bet(s)
            </div>
          )}
        </div>
      )}

      {allPlayerResults.length > 0 && (
        <div>
          <h4 className="text-blue-light text-sm font-semibold mb-2">
            All Players:
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {allPlayerResults.map((result) => (
              <div
                key={result.userId}
                className="flex justify-between text-sm bg-blue-dark/50 p-2 rounded"
              >
                <span className="text-blue-lightest truncate">
                  {result.username}
                </span>
                <span
                  className={
                    result.netResult > 0
                      ? "text-green-400"
                      : result.netResult < 0
                      ? "text-red-400"
                      : "text-blue-light"
                  }
                >
                  {result.netResult > 0 ? "+" : ""}
                  {result.netResult} CCC
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Connection status indicator
 */
function ConnectionStatus() {
  const { state, connect } = useRouletteMultiplayer();

  if (state.isConnected) return null;

  const isAuthError =
    state.error?.includes("No access token") || state.error?.includes("token");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-blue-dark border border-blue rounded-lg p-8 text-center max-w-md">
        {state.isConnecting ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-light border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-blue-lightest text-lg">Connecting...</p>
          </>
        ) : isAuthError ? (
          <>
            <p className="text-blue-lightest text-lg mb-4">
              You must be logged in to play multiplayer roulette.
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-blue hover:bg-blue-light text-blue-darkest font-bold rounded-lg transition"
            >
              Login
            </a>
          </>
        ) : (
          <>
            <p className="text-blue-lightest text-lg mb-4">
              {state.error || "Disconnected from game server"}
            </p>
            <button
              onClick={connect}
              className="px-6 py-3 bg-blue hover:bg-blue-light text-blue-darkest font-bold rounded-lg transition"
            >
              Reconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Main multiplayer roulette game content
 */
function MultiplayerRouletteContent({ config }: { config: RouletteConfig }) {
  const { state, placeBet, removeBet, clearBets, lockBets, setPlayerLocked } =
    useRouletteMultiplayer();

  // Local UI state
  const [display, setDisplay] = useState(false); // false = betting, true = gaming
  const [betAmount, setBetAmount] = useState(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betError, setBetError] = useState("");
  const [betLocked, setBetLocked] = useState(false);
  const [prevPhase, setPrevPhase] = useState(state.phase);

  // Wheel animation state
  const [mustSpin, setMustSpin] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);

  // Phase display
  const phaseDisplay = getPhaseDisplay(state.phase, state.bettingTriggeredBy);

  /**
   * Toggle number selection
   */
  const toggleNumberSelection = (num: number) => {
    if (!state.canBet || betLocked) return;

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  /**
   * Place a simple bet (red, black, etc.)
   */
  const addSimpleBet = useCallback(
    (type: "red" | "black" | "even" | "odd" | "low" | "high") => {
      if (!state.canBet || betLocked) {
        setBetError("Cannot place bets now.");
        setTimeout(() => setBetError(""), 3000);
        return;
      }

      if (betAmount <= 0) {
        setBetError("Bet amount must be positive");
        setTimeout(() => setBetError(""), 3000);
        return;
      }

      placeBet({ type, amount: betAmount });
    },
    [state.canBet, betAmount, placeBet, betLocked]
  );

  /**
   * Place column or dozen bet
   */
  const addNumberBet = useCallback(
    (type: "column" | "dozen", value: number) => {
      if (!state.canBet || betLocked) {
        setBetError("Cannot place bets now.");
        setTimeout(() => setBetError(""), 3000);
        return;
      }

      if (betAmount <= 0) {
        setBetError("Bet amount must be positive");
        setTimeout(() => setBetError(""), 3000);
        return;
      }

      placeBet({ type, value, amount: betAmount });
    },
    [state.canBet, betAmount, placeBet, betLocked]
  );

  /**
   * Place advanced bet from selected numbers
   */
  const addAdvancedBet = useCallback(() => {
    if (!state.canBet || betLocked) {
      setBetError("Cannot place bets now.");
      setTimeout(() => setBetError(""), 3000);
      return;
    }

    if (selectedNumbers.length === 0) {
      setBetError("Select at least one number");
      setTimeout(() => setBetError(""), 3000);
      return;
    }

    if (betAmount <= 0) {
      setBetError("Bet amount must be positive");
      setTimeout(() => setBetError(""), 3000);
      return;
    }

    let type: BetType;

    switch (selectedNumbers.length) {
      case 1:
        type = "straight";
        break;
      case 2:
        type = "split";
        break;
      case 3:
        type = "street";
        break;
      case 4:
        type = "corner";
        break;
      case 6:
        type = "line";
        break;
      default:
        setBetError(`Cannot create bet with ${selectedNumbers.length} numbers`);
        setTimeout(() => setBetError(""), 3000);
        return;
    }

    placeBet({
      type,
      numbers: [...selectedNumbers].sort((a, b) => a - b),
      amount: betAmount,
    });
    setSelectedNumbers([]);
  }, [state.canBet, selectedNumbers, betAmount, placeBet, betLocked]);

  /**
   * Lock bets and trigger countdown
   */
  const handleLockBets = useCallback(() => {
    if (state.yourBets.length === 0) {
      setBetError("Place at least one bet before locking");
      setTimeout(() => setBetError(""), 3000);
      return;
    }
    setBetLocked(true);
    lockBets(); // Send LOCK_BETS message to server to trigger countdown
    setPlayerLocked(state.yourUserId, true); // Mark current player as locked
    setDisplay(true); // Switch to gaming view
  }, [state.yourBets.length, state.yourUserId, lockBets, setPlayerLocked]);

  // Handle error from context
  useEffect(() => {
    if (state.error && !betError) {
      setBetError(state.error);
      const clearTimer = setTimeout(() => setBetError(""), 5000);
      return () => clearTimeout(clearTimer);
    }
  }, [state.error, betError]);

  // Reset locked state when phase changes away from betting
  useEffect(() => {
    if (state.phase !== "waiting" && state.phase !== "betting") {
      setBetLocked(false);
    }
  }, [state.phase]);

  // Handle wheel animation when spinning starts
  useEffect(() => {
    if (state.phase === "spinning" && state.spinResult) {
      // Set winning number and trigger spin animation
      setWinningNumber(state.spinResult.winningNumber);
      setMustSpin(true);

      // Stop spinning after animation completes (5 seconds)
      const timer = setTimeout(() => {
        setMustSpin(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else if (
      state.phase === "results" ||
      state.phase === "waiting" ||
      state.phase === "betting"
    ) {
      // Reset spin state when phase changes away from spinning
      setMustSpin(false);
    }
  }, [state.phase, state.spinResult]);

  // Auto-redirect to betting view when results phase ends
  useEffect(() => {
    // Only redirect back if we were in results and just switched away
    if (prevPhase === "results" && state.phase !== "results" && display) {
      setDisplay(false);
      setBetLocked(false);
      setSelectedNumbers([]);
      setBetAmount(10);
    }
    setPrevPhase(state.phase);
  }, [state.phase, display, prevPhase]);

  if (display) {
    // GAMING VIEW - Shows wheel and results
    return (
      <div className="min-h-screen bg-blue-darkest">
        <ConnectionStatus />

        {/* Header */}
        <Navbar
          balance={state.yourBalance}
          currentPage="Multiplayer Roulette"
        />

        <div className="bg-blue-dark/30 backdrop-blur border border-blue rounded-xl p-8 my-8">
          {/* Timer and Phase Display */}
          <div className="text-center mb-6">
            <div className={`text-3xl font-bold ${phaseDisplay.color}`}>
              {phaseDisplay.text}
            </div>
            <div className="text-5xl font-mono text-blue-lightest mt-2">
              {formatTime(state.timeRemaining)}
            </div>
            {phaseDisplay.subtext && (
              <p className="text-blue-light/60 text-sm mt-1">
                {phaseDisplay.subtext}
              </p>
            )}
          </div>

          {/* Layout: Players left, Wheel center, Results/Bets right */}
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            {/* Left: Players list */}
            <div>
              <PlayersList />
            </div>

            {/* Center: Wheel */}
            <div className="flex flex-col items-center gap-6">
              <RouletteWheel
                winningNumber={winningNumber}
                isSpinning={mustSpin}
              />
            </div>

            {/* Right: Results (shown in results phase) or current bets */}
            {state.phase !== "results" && (
              <div>
                <MultiplayerCurrentBets
                  multipliers={config.payouts}
                  betLocked={true}
                />
              </div>
            )}
            {state.phase === "results" && (
              <div>
                <ResultsPanel />
                <button
                  onClick={() => {
                    setDisplay(false);
                    setBetLocked(false);
                    setSelectedNumbers([]);
                  }}
                  className="w-full mt-4 px-6 py-3 rounded-lg font-bold text-lg transition bg-blue hover:bg-blue-light text-blue-darkest"
                >
                  Back to Betting
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    // BETTING VIEW - Shows table and betting controls
    return (
      <div className="min-h-screen bg-blue-darkest">
        <ConnectionStatus />

        {/* Header */}
        <Navbar
          balance={state.yourBalance}
          currentPage="Multiplayer Roulette"
        />

        <div className="container mx-auto px-4 py-8">
          {/* Timer and Phase Display */}
          <div className="text-center mb-6">
            <div className={`text-3xl font-bold ${phaseDisplay.color}`}>
              {phaseDisplay.text}
            </div>
            {state.phase === "waiting" ? (
              <div className="text-2xl text-blue-light/80 mt-2">
                {phaseDisplay.subtext}
              </div>
            ) : (
              <div className="text-4xl font-mono text-blue-lightest mt-2">
                {formatTime(state.timeRemaining)}
              </div>
            )}
          </div>

          {/* Main content grid */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Players column */}
            <div
              className={`space-y-4 ${
                state.yourBets.length === 0 ? "lg:col-span-2" : "lg:col-span-1"
              }`}
            >
              <PlayersList />
              <BettingControls
                betAmount={betAmount}
                onBetAmountChange={(amount) =>
                  setBetAmount(
                    typeof amount === "string" ? state.yourBalance || 0 : amount
                  )
                }
              />
              <BetErrorDisplay error={betError} />
            </div>

            {/* Controls and bets column */}
            <div
              className={` ${
                state.yourBets.length === 0 ? "hidden" : "lg:col-span-1"
              }`}
            >
              <MultiplayerCurrentBets
                multipliers={config.payouts}
                betLocked={betLocked}
              />
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
                    disabled={
                      selectedNumbers.length === 0 || !state.canBet || betLocked
                    }
                    className={`flex-1 py-2 rounded-lg font-bold text-lg transition ${
                      selectedNumbers.length === 0 || !state.canBet || betLocked
                        ? "bg-gray-600 cursor-not-allowed text-gray-400"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    Place Bet ({betAmount} CCC)
                  </button>
                  <button
                    onClick={() => setSelectedNumbers([])}
                    disabled={betLocked}
                    className={`px-6 py-2 rounded-lg font-bold text-lg transition ${
                      betLocked
                        ? "bg-gray-600 cursor-not-allowed text-gray-400"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }`}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>

            {/* Lock bets button */}
            {state.canBet && (
              <div className="col-span-full">
                <div
                  className={`flex bg-blue-dark/30 backdrop-blur border border-blue rounded-lg p-2 transition-all duration-300 shadow-lg shadow-black/50 justify-center ${
                    state.yourBets.length === 0 ? "" : "group hover:p-0"
                  }`}
                >
                  <button
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      state.yourBets.length === 0
                        ? "flex-0 px-6 bg-gray-600 cursor-not-allowed text-gray-400"
                        : "flex-1 group-hover:p-4 bg-green-600 hover:bg-green-500 active:scale-95"
                    }`}
                    onClick={handleLockBets}
                    disabled={state.yourBets.length === 0 || betLocked}
                  >
                    <span className="text-white whitespace-nowrap font-semibold group-hover:animate-pulse group-hover:text-2xl group-hover:underline transition-all duration-300">
                      Lock bets
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Wrapper component that loads config and provides context
 */
function MultiplayerRouletteWrapper() {
  const [config, setConfig] = useState<RouletteConfig | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getRouletteConfig()
      .then(setConfig)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
        <div className="text-blue-light text-xl">Loading roulette...</div>
      </div>
    );
  }

  return (
    <RouletteMultiplayerProvider autoConnect>
      <MultiplayerRouletteContent config={config} />
    </RouletteMultiplayerProvider>
  );
}

export default function MultiplayerRoulettePage() {
  return <MultiplayerRouletteWrapper />;
}
