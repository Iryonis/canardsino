/**
 * Duck Race Context
 * Manages multiplayer duck race game state via WebSocket
 */

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  useDuckRaceWebSocket,
  type DuckRacePhase,
  type DuckPlayer,
  type DuckColor,
  type RaceStatePayload,
  type DuckPlayerJoinedPayload,
  type DuckPlayerLeftPayload,
  type DuckBetPlacedPayload,
  type DuckBettingStartedPayload,
  type CountdownTickPayload,
  type RaceStartedPayload,
  type RaceUpdatePayload,
  type RaceFinishedPayload,
  type WaitingForPlayersPayload,
  type DuckBalanceUpdatePayload,
  type DuckErrorPayload,
} from "@/hooks/useDuckRaceWebSocket";

// State types
interface DuckRaceState {
  // Connection
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Room state
  roomId: string;
  roundId: string;
  phase: DuckRacePhase;
  timeRemaining: number;

  // Race state
  betAmount: number;
  totalPot: number;
  players: DuckPlayer[];
  playerCount: number;

  // Your state
  yourBalance: number;
  yourHasBet: boolean;
  yourLane: number | null;

  // Race result
  winner: {
    userId: string;
    username: string;
    lane: number;
    color: DuckColor;
    winnings: number;
  } | null;
  yourResult: {
    rank: number;
    betAmount: number;
    winnings: number;
    netResult: number;
    newBalance: number;
  } | null;
  finalPositions: Array<{
    userId: string;
    username: string;
    position: number;
    lane: number;
    rank: number;
  }>;

  // Betting trigger info
  bettingTriggeredBy: { userId: string; username: string } | null;

  // Leader during race
  leaderId: string | null;

  // UI helpers
  canBet: boolean;
  isRacing: boolean;
  isCountdown: boolean;
  isWaiting: boolean;
  isFinished: boolean;
}

// Actions
type Action =
  | { type: "SET_CONNECTING"; payload: boolean }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_RACE_STATE"; payload: RaceStatePayload }
  | { type: "PLAYER_JOINED"; payload: DuckPlayerJoinedPayload }
  | { type: "PLAYER_LEFT"; payload: DuckPlayerLeftPayload }
  | { type: "BET_PLACED"; payload: DuckBetPlacedPayload }
  | { type: "BETTING_STARTED"; payload: DuckBettingStartedPayload }
  | { type: "COUNTDOWN_TICK"; payload: CountdownTickPayload }
  | { type: "RACE_STARTED"; payload: RaceStartedPayload }
  | { type: "RACE_UPDATE"; payload: RaceUpdatePayload }
  | { type: "RACE_FINISHED"; payload: RaceFinishedPayload }
  | { type: "WAITING_FOR_PLAYERS"; payload: WaitingForPlayersPayload }
  | { type: "BALANCE_UPDATE"; payload: DuckBalanceUpdatePayload }
  | { type: "RESET" };

// Initial state
const initialState: DuckRaceState = {
  isConnected: false,
  isConnecting: false,
  error: null,
  roomId: "",
  roundId: "",
  phase: "waiting",
  timeRemaining: 0,
  betAmount: 0,
  totalPot: 0,
  players: [],
  playerCount: 0,
  yourBalance: 0,
  yourHasBet: false,
  yourLane: null,
  winner: null,
  yourResult: null,
  finalPositions: [],
  bettingTriggeredBy: null,
  leaderId: null,
  canBet: true,
  isRacing: false,
  isCountdown: false,
  isWaiting: true,
  isFinished: false,
};

// Reducer
function reducer(state: DuckRaceState, action: Action): DuckRaceState {
  switch (action.type) {
    case "SET_CONNECTING":
      return { ...state, isConnecting: action.payload };

    case "SET_CONNECTED":
      return {
        ...state,
        isConnected: action.payload,
        isConnecting: false,
        error: action.payload ? null : state.error,
      };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_RACE_STATE": {
      const { payload } = action;
      return {
        ...state,
        roomId: payload.roomId,
        roundId: payload.roundId,
        phase: payload.phase,
        timeRemaining: payload.timeRemaining,
        betAmount: payload.betAmount,
        totalPot: payload.totalPot,
        players: payload.players,
        playerCount: payload.players.length,
        yourBalance: payload.yourBalance,
        yourHasBet: payload.yourHasBet,
        yourLane: payload.yourLane ?? null,
        canBet: payload.phase === "waiting" || payload.phase === "betting",
        isRacing: payload.phase === "racing",
        isCountdown: payload.phase === "countdown",
        isWaiting: payload.phase === "waiting",
        isFinished: payload.phase === "finished",
        // Clear results when joining/reconnecting
        winner: null,
        yourResult: null,
        finalPositions: [],
        bettingTriggeredBy: null,
        leaderId: null,
      };
    }

    case "PLAYER_JOINED": {
      const { payload } = action;
      // Add new player to list if not already present
      const exists = state.players.some((p) => p.userId === payload.userId);
      if (exists) {
        return { ...state, playerCount: payload.playerCount };
      }
      return {
        ...state,
        players: [
          ...state.players,
          {
            userId: payload.userId,
            username: payload.username,
            hasBet: false,
            position: 0,
            lane: payload.lane,
            color: payload.color,
            isConnected: true,
          },
        ],
        playerCount: payload.playerCount,
      };
    }

    case "PLAYER_LEFT": {
      const { payload } = action;
      return {
        ...state,
        players: state.players.filter((p) => p.userId !== payload.userId),
        playerCount: payload.playerCount,
      };
    }

    case "BET_PLACED": {
      const { payload } = action;

      // Update player's bet status
      const updatedPlayers = state.players.map((p) => {
        if (p.userId === payload.userId) {
          return { ...p, hasBet: true };
        }
        return p;
      });

      // If this is your bet, update yourHasBet and yourBalance
      const isYourBet = payload.newBalance !== undefined;
      return {
        ...state,
        players: updatedPlayers,
        totalPot: payload.totalPot,
        yourHasBet: isYourBet ? true : state.yourHasBet,
        yourBalance: isYourBet ? payload.newBalance! : state.yourBalance,
        betAmount: state.betAmount || payload.betAmount,
      };
    }

    case "BETTING_STARTED": {
      const { payload } = action;
      return {
        ...state,
        roundId: payload.roundId,
        phase: "betting",
        betAmount: payload.betAmount,
        timeRemaining: payload.timeRemaining,
        bettingTriggeredBy: payload.triggeredBy,
        canBet: true,
        isRacing: false,
        isCountdown: false,
        isWaiting: false,
        isFinished: false,
      };
    }

    case "COUNTDOWN_TICK":
      return {
        ...state,
        phase: "countdown",
        timeRemaining: action.payload.timeRemaining,
        canBet: false,
        isRacing: false,
        isCountdown: true,
        isWaiting: false,
        isFinished: false,
      };

    case "RACE_STARTED": {
      const { payload } = action;
      return {
        ...state,
        phase: "racing",
        totalPot: payload.totalPot,
        canBet: false,
        isRacing: true,
        isCountdown: false,
        isWaiting: false,
        isFinished: false,
        // Reset positions
        players: state.players.map((p) => ({ ...p, position: 0 })),
      };
    }

    case "RACE_UPDATE": {
      const { payload } = action;
      // Update player positions
      const updatedPlayers = state.players.map((p) => {
        const posUpdate = payload.positions.find((pos) => pos.userId === p.userId);
        if (posUpdate) {
          return { ...p, position: posUpdate.position };
        }
        return p;
      });

      return {
        ...state,
        players: updatedPlayers,
        leaderId: payload.leaderId,
      };
    }

    case "RACE_FINISHED": {
      const { payload } = action;
      return {
        ...state,
        phase: "finished",
        timeRemaining: payload.timeUntilNextRace,
        winner: payload.winner,
        yourResult: payload.yourResult ?? null,
        yourBalance: payload.yourResult?.newBalance ?? state.yourBalance,
        finalPositions: payload.finalPositions,
        canBet: false,
        isRacing: false,
        isCountdown: false,
        isWaiting: false,
        isFinished: true,
      };
    }

    case "WAITING_FOR_PLAYERS": {
      const { payload } = action;
      return {
        ...state,
        roundId: payload.roundId,
        phase: "waiting",
        timeRemaining: 0,
        betAmount: 0,
        totalPot: 0,
        bettingTriggeredBy: null,
        canBet: true,
        isRacing: false,
        isCountdown: false,
        isWaiting: true,
        isFinished: false,
        // Reset player state but keep players in room
        yourHasBet: false,
        winner: null,
        yourResult: null,
        finalPositions: [],
        leaderId: null,
        players: state.players.map((p) => ({ ...p, hasBet: false, position: 0 })),
      };
    }

    case "BALANCE_UPDATE":
      return {
        ...state,
        yourBalance: action.payload.balance,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// Context types
interface DuckRaceContextType {
  state: DuckRaceState;
  connect: () => void;
  disconnect: () => void;
  placeBet: (amount: number) => void;
}

const DuckRaceContextInstance = createContext<DuckRaceContextType | null>(null);

// Provider props
interface DuckRaceProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

// Provider component
export function DuckRaceProvider({
  children,
  autoConnect = false,
}: DuckRaceProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // WebSocket callbacks
  const handleRaceState = useCallback((payload: RaceStatePayload) => {
    dispatch({ type: "SET_RACE_STATE", payload });
  }, []);

  const handlePlayerJoined = useCallback((payload: DuckPlayerJoinedPayload) => {
    dispatch({ type: "PLAYER_JOINED", payload });
  }, []);

  const handlePlayerLeft = useCallback((payload: DuckPlayerLeftPayload) => {
    dispatch({ type: "PLAYER_LEFT", payload });
  }, []);

  const handleBetPlaced = useCallback((payload: DuckBetPlacedPayload) => {
    dispatch({ type: "BET_PLACED", payload });
  }, []);

  const handleBettingStarted = useCallback((payload: DuckBettingStartedPayload) => {
    dispatch({ type: "BETTING_STARTED", payload });
  }, []);

  const handleCountdownTick = useCallback((payload: CountdownTickPayload) => {
    dispatch({ type: "COUNTDOWN_TICK", payload });
  }, []);

  const handleRaceStarted = useCallback((payload: RaceStartedPayload) => {
    dispatch({ type: "RACE_STARTED", payload });
  }, []);

  const handleRaceUpdate = useCallback((payload: RaceUpdatePayload) => {
    dispatch({ type: "RACE_UPDATE", payload });
  }, []);

  const handleRaceFinished = useCallback((payload: RaceFinishedPayload) => {
    dispatch({ type: "RACE_FINISHED", payload });
  }, []);

  const handleWaitingForPlayers = useCallback((payload: WaitingForPlayersPayload) => {
    dispatch({ type: "WAITING_FOR_PLAYERS", payload });
  }, []);

  const handleBalanceUpdate = useCallback((payload: DuckBalanceUpdatePayload) => {
    dispatch({ type: "BALANCE_UPDATE", payload });
  }, []);

  const handleError = useCallback((payload: DuckErrorPayload) => {
    dispatch({ type: "SET_ERROR", payload: payload.message });
    dispatch({ type: "SET_CONNECTING", payload: false });
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    dispatch({ type: "SET_CONNECTED", payload: connected });
  }, []);

  // Setup WebSocket hook
  const ws = useDuckRaceWebSocket({
    onRaceState: handleRaceState,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onBetPlaced: handleBetPlaced,
    onBettingStarted: handleBettingStarted,
    onCountdownTick: handleCountdownTick,
    onRaceStarted: handleRaceStarted,
    onRaceUpdate: handleRaceUpdate,
    onRaceFinished: handleRaceFinished,
    onWaitingForPlayers: handleWaitingForPlayers,
    onBalanceUpdate: handleBalanceUpdate,
    onError: handleError,
    onConnectionChange: handleConnectionChange,
  });

  // Connect function with connecting state
  const connect = useCallback(() => {
    dispatch({ type: "SET_CONNECTING", payload: true });
    ws.connect();
  }, [ws]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Context value
  const contextValue = useMemo<DuckRaceContextType>(
    () => ({
      state,
      connect,
      disconnect: ws.disconnect,
      placeBet: ws.placeBet,
    }),
    [state, connect, ws.disconnect, ws.placeBet]
  );

  return (
    <DuckRaceContextInstance.Provider value={contextValue}>
      {children}
    </DuckRaceContextInstance.Provider>
  );
}

// Hook to use the context
export function useDuckRace() {
  const context = useContext(DuckRaceContextInstance);
  if (!context) {
    throw new Error("useDuckRace must be used within a DuckRaceProvider");
  }
  return context;
}

// Export types
export type { DuckRaceState, DuckPlayer, DuckColor, DuckRacePhase };
