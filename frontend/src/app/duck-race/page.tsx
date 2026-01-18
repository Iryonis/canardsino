/**
 * Duck Race game page component
 * Multiplayer duck racing with room-based lobbies
 */

"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/navbar/navbar";
import { RaceTrack } from "@/components/duck-race";
import {
  DuckRaceProvider,
  useDuckRace,
  type DuckRacePhase,
  type RoomInfo,
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
function getPhaseDisplay(phase: DuckRacePhase): { text: string; subtext?: string; color: string } {
  switch (phase) {
    case "waiting":
      return {
        text: "Waiting for Players",
        subtext: "All players must be ready to start!",
        color: "text-blue-light",
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
 * Create Room Modal
 */
function CreateRoomModal({
  isOpen,
  onClose,
  balance,
}: {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
}) {
  const { createRoom } = useDuckRace();
  const [betAmount, setBetAmount] = useState(DUCK_RACE_CONFIG.MIN_BET);
  const [isPersistent, setIsPersistent] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");

  const handleCreate = useCallback(() => {
    if (betAmount < DUCK_RACE_CONFIG.MIN_BET) {
      setError(`Minimum bet is ${DUCK_RACE_CONFIG.MIN_BET} CCC`);
      return;
    }
    if (betAmount > balance) {
      setError("Insufficient balance");
      return;
    }
    createRoom(betAmount, isPersistent, roomName || undefined);
    onClose();
  }, [betAmount, balance, isPersistent, roomName, createRoom, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-blue-dark border border-blue rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-blue-lightest mb-4">Create Race Room</h2>

        {/* Room Name */}
        <div className="mb-4">
          <label className="block text-sm text-blue-light mb-2">Room Name (optional)</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="My Race Room"
            className="w-full px-4 py-2 bg-blue-darkest border border-blue rounded-lg text-blue-lightest focus:border-blue-light focus:outline-none"
          />
        </div>

        {/* Bet Amount */}
        <div className="mb-4">
          <label className="block text-sm text-blue-light mb-2">Bet Amount (CCC)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            min={DUCK_RACE_CONFIG.MIN_BET}
            step={1000}
            className="w-full px-4 py-3 bg-blue-darkest border border-blue rounded-lg text-blue-lightest font-mono text-lg focus:border-blue-light focus:outline-none"
          />
          <p className="text-xs text-blue-light/60 mt-1">
            Minimum: {DUCK_RACE_CONFIG.MIN_BET.toLocaleString()} CCC
          </p>
        </div>

        {/* Quick bet buttons */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[2000, 5000, 10000, 50000].map((amount) => (
            <button
              key={amount}
              onClick={() => setBetAmount(amount)}
              className={`px-2 py-2 rounded text-sm font-medium transition ${
                betAmount === amount
                  ? "bg-blue-light text-blue-darkest"
                  : "bg-blue-darkest border border-blue text-blue-light hover:bg-blue-dark"
              }`}
            >
              {(amount / 1000).toFixed(0)}K
            </button>
          ))}
        </div>

        {/* Persistence toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPersistent}
              onChange={(e) => setIsPersistent(e.target.checked)}
              className="w-5 h-5 rounded border-blue bg-blue-darkest"
            />
            <div>
              <span className="text-blue-lightest">Multi-race room</span>
              <p className="text-xs text-blue-light/60">
                Room stays open for multiple races
              </p>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Balance */}
        <div className="mb-4 p-3 bg-blue-darkest rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-blue-light">Your Balance:</span>
            <span className="text-blue-lightest font-mono">
              {balance.toLocaleString()} CCC
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-bold bg-blue-dark border border-blue text-blue-light hover:bg-blue-darkest transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-3 rounded-lg font-bold bg-green-600 hover:bg-green-700 text-white transition"
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Room Card for lobby display
 */
function RoomCard({ room }: { room: RoomInfo }) {
  const { joinRoom, state } = useDuckRace();
  const canJoin = state.yourBalance >= room.betAmount;

  return (
    <div className="bg-blue-dark/30 border border-blue rounded-lg p-4 hover:border-blue-light transition">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-blue-lightest">{room.roomName}</h3>
          <p className="text-sm text-blue-light/70">by {room.creatorUsername}</p>
        </div>
        {room.isPersistent && (
          <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded">
            Multi-race
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-blue-light/70">Bet Amount:</span>
          <p className="text-yellow-400 font-mono font-bold">
            {room.betAmount.toLocaleString()} CCC
          </p>
        </div>
        <div>
          <span className="text-blue-light/70">Players:</span>
          <p className="text-blue-lightest">
            {room.playerCount}/{room.maxPlayers}
            <span className="text-green-400 ml-2">({room.readyCount} ready)</span>
          </p>
        </div>
      </div>

      <button
        onClick={() => joinRoom(room.roomId)}
        disabled={!canJoin}
        className={`w-full py-2 rounded-lg font-bold transition ${
          canJoin
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-gray-600 text-gray-400 cursor-not-allowed"
        }`}
      >
        {canJoin ? "Join Room" : `Need ${room.betAmount.toLocaleString()} CCC`}
      </button>
    </div>
  );
}

/**
 * Lobby view showing available rooms
 */
function LobbyView() {
  const { state, getRooms } = useDuckRace();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="min-h-screen bg-blue-darkest">
      <Navbar balance={state.yourBalance} currentPage="Duck Race" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-lightest mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">🦆</span>
            Duck Race Lobby
            <span className="text-5xl">🦆</span>
          </h1>
          <p className="text-blue-light">Join a room or create your own race!</p>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
          >
            Create Room
          </button>
          <button
            onClick={getRooms}
            className="px-6 py-3 bg-blue-dark border border-blue hover:border-blue-light text-blue-light font-bold rounded-lg transition"
          >
            Refresh
          </button>
        </div>

        {/* Room List */}
        {state.rooms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.rooms.map((room) => (
              <RoomCard key={room.roomId} room={room} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🦆</div>
            <h2 className="text-2xl font-bold text-blue-lightest mb-2">No Rooms Available</h2>
            <p className="text-blue-light mb-6">Be the first to create a race!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-lg transition"
            >
              Create First Room
            </button>
          </div>
        )}

        {/* How to Play */}
        <div className="mt-12 bg-blue-dark/30 border border-blue rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-blue-lightest mb-4">How to Play</h3>
          <ul className="space-y-3 text-blue-light">
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold">1.</span>
              Create a room and set your bet amount, or join an existing room
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold">2.</span>
              Wait for at least 2 players (max 5)
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold">3.</span>
              All players must click &quot;Ready&quot; to start the race
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-bold">4.</span>
              Ducks race based on random numbers - first to finish wins!
            </li>
            <li className="flex items-start gap-3">
              <span className="text-yellow-400">🏆</span>
              Winner takes the entire pot!
            </li>
          </ul>
        </div>
      </div>

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        balance={state.yourBalance}
      />
    </div>
  );
}

/**
 * Players panel showing all participants with ready status
 */
function PlayersPanel() {
  const { state } = useDuckRace();

  return (
    <div className="bg-blue-dark/30 border border-blue rounded-lg p-4">
      <h3 className="text-blue-light font-semibold mb-3 flex items-center gap-2">
        <span className="text-2xl">🦆</span>
        Players ({state.playerCount}/{DUCK_RACE_CONFIG.MAX_PLAYERS})
        {state.isWaiting && (
          <span className="text-sm text-green-400 ml-auto">
            {state.readyCount}/{state.playerCount} ready
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {state.players.map((player) => (
          <div
            key={player.userId}
            className={`flex items-center justify-between p-2 rounded ${
              player.isConnected
                ? "bg-blue-dark/50"
                : "bg-gray-700/50 opacity-60"
            } ${player.isReady ? "border-l-4 border-green-500" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  player.isReady ? "bg-green-500" : "bg-gray-500"
                }`}
              ></span>
              <span className="text-blue-lightest truncate max-w-24">
                {player.username}
              </span>
              {player.userId === state.creatorId && (
                <span className="text-yellow-400 text-xs">👑</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {state.isWaiting && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    player.isReady
                      ? "bg-green-600/30 text-green-400"
                      : "bg-gray-600/30 text-gray-400"
                  }`}
                >
                  {player.isReady ? "Ready" : "Not Ready"}
                </span>
              )}
              <span className="text-sm text-blue-light">Lane {player.lane}</span>
            </div>
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
 * Ready panel for setting ready status
 */
function ReadyPanel() {
  const { state, setReady, leaveRoom } = useDuckRace();
  const [error, setError] = useState("");

  const handleReady = useCallback(() => {
    if (state.yourBalance < state.betAmount) {
      setError(`Need ${state.betAmount} CCC to participate`);
      setTimeout(() => setError(""), 3000);
      return;
    }
    setReady(!state.yourIsReady);
  }, [state.yourIsReady, state.yourBalance, state.betAmount, setReady]);

  const canStart =
    state.playerCount >= DUCK_RACE_CONFIG.MIN_PLAYERS &&
    state.readyCount === state.playerCount;

  return (
    <div className="bg-blue-dark/30 border border-blue rounded-lg p-4">
      <h3 className="text-blue-light font-semibold mb-3">Room Info</h3>

      {/* Room details */}
      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-blue-light">Room:</span>
          <span className="text-blue-lightest">{state.roomName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-blue-light">Bet Amount:</span>
          <span className="text-yellow-400 font-mono font-bold">
            {state.betAmount.toLocaleString()} CCC
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-blue-light">Your Balance:</span>
          <span className="text-blue-lightest font-mono">
            {state.yourBalance.toLocaleString()} CCC
          </span>
        </div>
        {state.isPersistent && (
          <div className="flex justify-between text-sm">
            <span className="text-blue-light">Type:</span>
            <span className="text-yellow-400">Multi-race room</span>
          </div>
        )}
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

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Ready button */}
      {state.isWaiting && (
        <>
          <button
            onClick={handleReady}
            className={`w-full py-3 rounded-lg font-bold text-lg transition mb-3 ${
              state.yourIsReady
                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {state.yourIsReady ? "Cancel Ready" : "Ready!"}
          </button>

          {/* Status message */}
          {state.yourIsReady ? (
            <p className="text-center text-green-400 text-sm">
              Waiting for other players to ready up...
            </p>
          ) : (
            <p className="text-center text-blue-light text-sm">
              Click Ready when you&apos;re prepared to race!
            </p>
          )}

          {canStart && (
            <p className="text-center text-yellow-400 text-sm mt-2 animate-pulse">
              All players ready! Race starting soon...
            </p>
          )}
        </>
      )}

      {/* Lane info */}
      {state.yourLane && (
        <div className="mt-4 p-3 bg-blue-dark/50 rounded-lg text-center">
          <span className="text-blue-light">Your Lane:</span>
          <span className="text-blue-lightest font-bold ml-2">{state.yourLane}</span>
        </div>
      )}

      {/* Leave button */}
      <button
        onClick={leaveRoom}
        className="w-full mt-4 py-2 rounded-lg font-bold bg-red-600/30 border border-red-500/50 text-red-400 hover:bg-red-600/50 transition"
      >
        Leave Room
      </button>
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

      {/* Next race info */}
      {state.isPersistent && (
        <p className="text-center text-blue-light text-sm">
          Next race in {state.timeRemaining}s...
        </p>
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
 * Room view - the actual game room
 */
function RoomView() {
  const { state } = useDuckRace();

  const phaseDisplay = getPhaseDisplay(state.phase);

  return (
    <div className="min-h-screen bg-blue-darkest">
      <CountdownOverlay />

      {/* Header */}
      <Navbar balance={state.yourBalance} currentPage="Duck Race" />

      <div className="container mx-auto px-4 py-8">
        {/* Title and Phase Display */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-lightest mb-2 flex items-center justify-center gap-3">
            <span className="text-5xl">🦆</span>
            {state.roomName}
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

          {/* Right columns - Ready/Info */}
          <div className="lg:col-span-2">
            <ReadyPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Duck Race game content
 */
function DuckRaceContent() {
  const { state } = useDuckRace();

  return (
    <>
      <ConnectionStatus />
      {state.isInLobby ? <LobbyView /> : <RoomView />}
    </>
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
