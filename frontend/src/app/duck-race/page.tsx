/**
 * Duck Race game page component
 * Multiplayer duck racing with WebSocket synchronization
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar/navbar";
import { RaceTrack } from "@/components/duck-race";
import {
  DuckRaceProvider,
  useDuckRace,
  type DuckRacePhase,
} from "@/contexts/DuckRaceContext";

// Game configuration
const DUCK_RACE_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 5,
  MIN_BET: 2000,
  TRACK_LENGTH: 100,
};

/**
 * Format time remaining as seconds
 */
function formatTime(seconds: number): string {
  return seconds.toString();
}

/**
 * Get phase display text and color
 */
function getPhaseDisplay(
  phase: DuckRacePhase,
  triggeredBy?: { username: string } | null
): { text: string; subtext?: string; color: string } {
  switch (phase) {
    case "waiting":
      return {
        text: "Waiting for Players",
        subtext: "Be the first to bet and set the race amount!",
        color: "text-blue-light",
      };
    case "betting":
      return {
        text: "Place Your Bets!",
        subtext: triggeredBy
          ? `${triggeredBy.username} set the race amount`
          : undefined,
        color: "text-green-400",
      };
    case "countdown":
      return {
        text: "Get Ready!",
        subtext: "Race is about to start...",
        color: "text-yellow-400",
      };
    case "racing":
      return {
        text: "GO GO GO!",
        color: "text-green-500",
      };
    case "finished":
      return {
        text: "Race Complete!",
        color: "text-blue-light",
      };
    default:
      return { text: phase, color: "text-blue-light" };
  }
}

/**
 * Players panel showing all participants
 */
function PlayersPanel() {
  const { state } = useDuckRace();

  return (
    <div className="bg-blue-dark/30 border border-blue rounded-lg p-4">
      <h3 className="text-blue-light font-semibold mb-3 flex items-center gap-2">
        <span className="text-2xl">🦆</span>
        Players ({state.playerCount}/{DUCK_RACE_CONFIG.MAX_PLAYERS})
      </h3>
      <div className="space-y-2">
        {state.players.map((player) => (
          <div
            key={player.userId}
            className={`flex items-center justify-between p-2 rounded ${
              player.isConnected
                ? "bg-blue-dark/50"
                : "bg-gray-700/50 opacity-60"
            } ${player.hasBet ? "border-l-4 border-green-500" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  player.hasBet ? "bg-green-500" : "bg-gray-500"
                }`}
              ></span>
              <span className="text-blue-lightest truncate max-w-24">
                {player.username}
              </span>
            </div>
            <span className="text-sm text-blue-light">Lane {player.lane}</span>
          </div>
        ))}
        {state.players.length === 0 && (
          <p className="text-blue-light/60 text-sm text-center py-4">
            No players yet. Be the first to join!
          </p>
        )}
        {state.players.length < DUCK_RACE_CONFIG.MIN_PLAYERS && (
          <p className="text-yellow-400/80 text-xs text-center mt-2">
            Need {DUCK_RACE_CONFIG.MIN_PLAYERS - state.players.length} more
            player(s) to start
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Betting panel for placing bets
 */
function BettingPanel() {
  const { state, placeBet } = useDuckRace();
  const [betAmount, setBetAmount] = useState(DUCK_RACE_CONFIG.MIN_BET);
  const [error, setError] = useState("");

  // Update bet amount when betting phase starts (must match room amount)
  useEffect(() => {
    if (state.betAmount > 0) {
      setBetAmount(state.betAmount);
    }
  }, [state.betAmount]);

  const handlePlaceBet = useCallback(() => {
    if (state.yourHasBet) {
      setError("You already placed a bet");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!state.canBet) {
      setError("Cannot place bets now");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (betAmount < DUCK_RACE_CONFIG.MIN_BET) {
      setError(`Minimum bet is ${DUCK_RACE_CONFIG.MIN_BET} CCC`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (betAmount > state.yourBalance) {
      setError("Insufficient balance");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // If betting phase already started, must match the bet amount
    if (state.phase === "betting" && state.betAmount > 0 && betAmount !== state.betAmount) {
      setError(`Must bet exactly ${state.betAmount} CCC to join this race`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    placeBet(betAmount);
  }, [state, betAmount, placeBet]);

  // Handle error from context
  useEffect(() => {
    if (state.error) {
      setError(state.error);
      setTimeout(() => setError(""), 5000);
    }
  }, [state.error]);

  const canPlaceBet =
    state.canBet &&
    !state.yourHasBet &&
    state.players.length < DUCK_RACE_CONFIG.MAX_PLAYERS;
  const mustMatchBet = state.phase === "betting" && state.betAmount > 0;

  return (
    <div className="bg-blue-dark/30 border border-blue rounded-lg p-4">
      <h3 className="text-blue-light font-semibold mb-3">Place Your Bet</h3>

      {/* Balance display */}
      <div className="mb-4 p-3 bg-blue-dark/50 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-blue-light">Your Balance:</span>
          <span className="text-blue-lightest font-mono">
            {state.yourBalance.toLocaleString()} CCC
          </span>
        </div>
      </div>

      {/* Pot display */}
      {state.totalPot > 0 && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-yellow-400">Total Pot:</span>
            <span className="text-yellow-300 font-mono font-bold">
              {state.totalPot.toLocaleString()} CCC
            </span>
          </div>
          <div className="text-xs text-yellow-400/70 mt-1">
            Winner takes all!
          </div>
        </div>
      )}

      {/* Bet amount input */}
      <div className="mb-4">
        <label className="block text-sm text-blue-light mb-2">
          {mustMatchBet ? "Race Amount (fixed)" : "Bet Amount (CCC)"}
        </label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(Number(e.target.value))}
          min={DUCK_RACE_CONFIG.MIN_BET}
          step={1000}
          disabled={!canPlaceBet || mustMatchBet}
          className="w-full px-4 py-3 bg-blue-dark border border-blue rounded-lg text-blue-lightest font-mono text-lg focus:border-blue-light focus:outline-none disabled:opacity-50"
        />
        <p className="text-xs text-blue-light/60 mt-1">
          Minimum: {DUCK_RACE_CONFIG.MIN_BET.toLocaleString()} CCC
        </p>
      </div>

      {/* Quick bet buttons */}
      {!mustMatchBet && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[2000, 5000, 10000, 50000].map((amount) => (
            <button
              key={amount}
              onClick={() => setBetAmount(amount)}
              disabled={!canPlaceBet}
              className={`px-2 py-2 rounded text-sm font-medium transition ${
                betAmount === amount
                  ? "bg-blue-light text-blue-darkest"
                  : "bg-blue-dark/50 text-blue-light hover:bg-blue-dark"
              } disabled:opacity-50`}
            >
              {(amount / 1000).toFixed(0)}K
            </button>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Bet button */}
      {state.yourHasBet ? (
        <div className="w-full py-3 bg-green-600/30 border border-green-500 text-green-400 text-center rounded-lg font-bold">
          Bet Placed - Lane {state.yourLane}
        </div>
      ) : (
        <button
          onClick={handlePlaceBet}
          disabled={!canPlaceBet}
          className={`w-full py-3 rounded-lg font-bold text-lg transition ${
            canPlaceBet
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }`}
        >
          {state.phase === "waiting"
            ? `Start Race (${betAmount.toLocaleString()} CCC)`
            : `Join Race (${betAmount.toLocaleString()} CCC)`}
        </button>
      )}

      {/* Status messages */}
      {state.phase === "waiting" && !state.yourHasBet && (
        <p className="text-center text-green-400 text-sm mt-3">
          Set the race bet amount!
        </p>
      )}
      {state.phase === "betting" && !state.yourHasBet && (
        <p className="text-center text-yellow-400 text-sm mt-3">
          Hurry! Betting closes soon.
        </p>
      )}
    </div>
  );
}

/**
 * Results panel showing race outcome
 */
function ResultsPanel() {
  const { state } = useDuckRace();

  if (state.phase !== "finished" || !state.winner) return null;

  return (
    <div className="bg-blue-dark/50 border border-blue-light rounded-lg p-6 space-y-4">
      {/* Winner announcement */}
      <div className="text-center">
        <div className="text-4xl mb-2">🏆</div>
        <div className="text-2xl font-bold text-yellow-400">
          {state.winner.username} Wins!
        </div>
        <div className="text-xl text-green-400 mt-1">
          +{state.winner.winnings.toLocaleString()} CCC
        </div>
      </div>

      {/* Your result */}
      {state.yourResult && (
        <div
          className={`text-center p-4 rounded-lg ${
            state.yourResult.winnings > 0
              ? "bg-green-600/30 border border-green-500"
              : "bg-red-600/30 border border-red-500"
          }`}
        >
          <div className="text-lg font-bold">
            {state.yourResult.winnings > 0 ? (
              <span className="text-green-400">
                You Won! +{state.yourResult.winnings.toLocaleString()} CCC
              </span>
            ) : (
              <span className="text-red-400">
                {state.yourResult.rank > 0
                  ? `Rank #${state.yourResult.rank} - ${Math.abs(
                      state.yourResult.netResult
                    ).toLocaleString()} CCC`
                  : "Better luck next time!"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Final standings */}
      {state.finalPositions.length > 0 && (
        <div>
          <h4 className="text-blue-light text-sm font-semibold mb-2">
            Final Standings:
          </h4>
          <div className="space-y-1">
            {state.finalPositions.map((result) => (
              <div
                key={result.userId}
                className={`flex justify-between text-sm p-2 rounded ${
                  result.rank === 1
                    ? "bg-yellow-900/30 border border-yellow-500/50"
                    : "bg-blue-dark/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-light">
                    #{result.rank}
                  </span>
                  <span className="text-blue-lightest">{result.username}</span>
                </div>
                <span className="text-blue-light/70">
                  {Math.round(result.position)}%
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
 * Countdown overlay for dramatic effect
 */
function CountdownOverlay() {
  const { state } = useDuckRace();

  if (state.phase !== "countdown") return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 pointer-events-none">
      <div className="text-center">
        <div className="text-9xl font-bold text-yellow-400 animate-pulse">
          {state.timeRemaining}
        </div>
        <div className="text-3xl text-white mt-4">Get Ready!</div>
      </div>
    </div>
  );
}

/**
 * Connection status indicator
 */
function ConnectionStatus() {
  const { state, connect } = useDuckRace();

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
            <div className="text-6xl mb-4">🦆</div>
            <p className="text-blue-lightest text-lg mb-4">
              You must be logged in to play Duck Race.
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
            <div className="text-6xl mb-4">🦆</div>
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
 * Main Duck Race game content
 */
function DuckRaceContent() {
  const { state } = useDuckRace();

  const phaseDisplay = getPhaseDisplay(state.phase, state.bettingTriggeredBy);

  return (
    <div className="min-h-screen bg-blue-darkest">
      <ConnectionStatus />
      <CountdownOverlay />

      {/* Header */}
      <Navbar balance={state.yourBalance} currentPage="Duck Race" />

      <div className="container mx-auto px-4 py-8">
        {/* Title and Phase Display */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-lightest mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">🦆</span>
            Duck Race
            <span className="text-5xl">🦆</span>
          </h1>
          <div className={`text-2xl font-bold ${phaseDisplay.color}`}>
            {phaseDisplay.text}
          </div>
          {state.phase !== "waiting" && state.phase !== "racing" && (
            <div className="text-4xl font-mono text-blue-lightest mt-2">
              {formatTime(state.timeRemaining)}s
            </div>
          )}
          {phaseDisplay.subtext && (
            <p className="text-blue-light/60 text-sm mt-1">
              {phaseDisplay.subtext}
            </p>
          )}
        </div>

        {/* Race Track */}
        <div className="mb-8">
          <RaceTrack
            players={state.players}
            isRacing={state.isRacing}
            winnerId={state.winner?.userId || null}
            leaderId={state.leaderId}
            trackLength={DUCK_RACE_CONFIG.TRACK_LENGTH}
          />
        </div>

        {/* Results Panel (shows after race) */}
        <ResultsPanel />

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          {/* Left column - Players */}
          <div className="lg:col-span-1">
            <PlayersPanel />
          </div>

          {/* Right columns - Betting */}
          <div className="lg:col-span-2">
            <BettingPanel />

            {/* Game Rules */}
            <div className="mt-6 bg-blue-dark/30 border border-blue rounded-lg p-4">
              <h3 className="text-blue-light font-semibold mb-3">
                How to Play
              </h3>
              <ul className="space-y-2 text-sm text-blue-light/80">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">1.</span>
                  Join the race by placing a bet (min{" "}
                  {DUCK_RACE_CONFIG.MIN_BET.toLocaleString()} CCC)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">2.</span>
                  First player sets the bet amount - others must match
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">3.</span>
                  Need at least {DUCK_RACE_CONFIG.MIN_PLAYERS} players to start
                  (max {DUCK_RACE_CONFIG.MAX_PLAYERS})
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">4.</span>
                  Ducks race based on random numbers - first to finish wins!
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">🏆</span>
                  Winner takes the entire pot!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper component that provides context
 */
export default function DuckRacePage() {
  return (
    <DuckRaceProvider autoConnect>
      <DuckRaceContent />
    </DuckRaceProvider>
  );
}
