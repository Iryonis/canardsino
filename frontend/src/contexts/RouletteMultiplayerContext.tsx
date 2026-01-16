/**
 * Roulette Multiplayer Context
 * Manages multiplayer game state via WebSocket
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
  useRouletteWebSocket,
  type RoundPhase,
  type PlayerInfo,
  type SpinResult,
  type PlayerResult,
  type YourResult,
  type Bet,
  type RoomStatePayload,
  type BetPlacedPayload,
  type BetRemovedPayload,
  type BetsClearedPayload,
  type RoundCountdownPayload,
  type SpinStartingPayload,
  type SpinResultPayload,
  type ErrorPayload,
  type PlayerJoinedPayload,
  type PlayerLeftPayload,
  type BettingStartedPayload,
  type WaitingForBetsPayload,
} from "@/hooks/useRouletteWebSocket";

// State types
interface MultiplayerState {
  // Connection
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Room state
  roomId: string;
  roundId: string;
  phase: RoundPhase;
  timeRemaining: number;

  // Players
  players: PlayerInfo[];
  playerCount: number;

  // Your state
  yourBets: Bet[];
  yourTotalBet: number;
  yourBalance: number;

  // Spin result (when in results phase)
  spinResult: SpinResult | null;
  allPlayerResults: PlayerResult[];
  yourResult: YourResult | null;

  // Betting trigger info
  bettingTriggeredBy: { userId: string; username: string } | null;

  // UI helpers
  canBet: boolean;
  isSpinning: boolean;
  isWaiting: boolean;
  lastWinningNumber: number | null;
}

// Actions
type Action =
  | { type: "SET_CONNECTING"; payload: boolean }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_ROOM_STATE"; payload: RoomStatePayload }
  | { type: "PLAYER_JOINED"; payload: PlayerJoinedPayload }
  | { type: "PLAYER_LEFT"; payload: PlayerLeftPayload }
  | { type: "BET_PLACED"; payload: BetPlacedPayload }
  | { type: "BET_REMOVED"; payload: BetRemovedPayload }
  | { type: "BETS_CLEARED"; payload: BetsClearedPayload }
  | { type: "BETTING_STARTED"; payload: BettingStartedPayload }
  | { type: "WAITING_FOR_BETS"; payload: WaitingForBetsPayload }
  | { type: "ROUND_COUNTDOWN"; payload: RoundCountdownPayload }
  | { type: "SPIN_STARTING"; payload: SpinStartingPayload }
  | { type: "SPIN_RESULT"; payload: SpinResultPayload }
  | { type: "RESET" };

// Initial state
const initialState: MultiplayerState = {
  isConnected: false,
  isConnecting: false,
  error: null,
  roomId: "",
  roundId: "",
  phase: "waiting",
  timeRemaining: 0,
  players: [],
  playerCount: 0,
  yourBets: [],
  yourTotalBet: 0,
  yourBalance: 0,
  spinResult: null,
  allPlayerResults: [],
  yourResult: null,
  bettingTriggeredBy: null,
  canBet: true,
  isSpinning: false,
  isWaiting: true,
  lastWinningNumber: null,
};

// Reducer
function reducer(state: MultiplayerState, action: Action): MultiplayerState {
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

    case "SET_ROOM_STATE": {
      const { payload } = action;
      return {
        ...state,
        roomId: payload.roomId,
        roundId: payload.roundId,
        phase: payload.phase,
        timeRemaining: payload.timeRemaining,
        players: payload.players,
        playerCount: payload.players.length,
        yourBets: payload.yourBets,
        yourTotalBet: payload.yourBets.reduce((sum, b) => sum + b.amount, 0),
        yourBalance: payload.yourBalance,
        canBet: payload.phase === "waiting" || payload.phase === "betting",
        isSpinning: payload.phase === "spinning",
        isWaiting: payload.phase === "waiting",
        bettingTriggeredBy: null,
        // Clear results when joining/reconnecting
        spinResult: null,
        allPlayerResults: [],
        yourResult: null,
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
            bets: [],
            totalBet: 0,
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

      // Update player's bets in players array
      const updatedPlayers = state.players.map((p) => {
        if (p.userId === payload.userId) {
          return {
            ...p,
            bets: [...p.bets, payload.bet],
            totalBet: payload.totalBet,
          };
        }
        return p;
      });

      // If this is your bet, update yourBets and yourBalance
      const isYourBet = payload.newBalance !== undefined;
      return {
        ...state,
        players: updatedPlayers,
        yourBets: isYourBet ? [...state.yourBets, payload.bet] : state.yourBets,
        yourTotalBet: isYourBet ? payload.totalBet : state.yourTotalBet,
        yourBalance: isYourBet ? payload.newBalance! : state.yourBalance,
      };
    }

    case "BET_REMOVED": {
      const { payload } = action;

      // Update player's bets in players array
      const updatedPlayers = state.players.map((p) => {
        if (p.userId === payload.userId) {
          const newBets = [...p.bets];
          newBets.splice(payload.betIndex, 1);
          return {
            ...p,
            bets: newBets,
            totalBet: payload.totalBet,
          };
        }
        return p;
      });

      // If this is your bet, update yourBets and yourBalance
      const isYourBet = payload.newBalance !== undefined;
      if (isYourBet) {
        const newYourBets = [...state.yourBets];
        newYourBets.splice(payload.betIndex, 1);
        return {
          ...state,
          players: updatedPlayers,
          yourBets: newYourBets,
          yourTotalBet: payload.totalBet,
          yourBalance: payload.newBalance!,
        };
      }

      return { ...state, players: updatedPlayers };
    }

    case "BETS_CLEARED": {
      const { payload } = action;

      // Update player's bets in players array
      const updatedPlayers = state.players.map((p) => {
        if (p.userId === payload.userId) {
          return { ...p, bets: [], totalBet: 0 };
        }
        return p;
      });

      // If this is your clear, update yourBets and yourBalance
      const isYourClear = payload.newBalance !== undefined;
      return {
        ...state,
        players: updatedPlayers,
        yourBets: isYourClear ? [] : state.yourBets,
        yourTotalBet: isYourClear ? 0 : state.yourTotalBet,
        yourBalance: isYourClear ? payload.newBalance! : state.yourBalance,
      };
    }

    case "BETTING_STARTED": {
      const { payload } = action;
      return {
        ...state,
        roundId: payload.roundId,
        phase: payload.phase,
        timeRemaining: payload.timeRemaining,
        bettingTriggeredBy: payload.triggeredBy,
        canBet: true,
        isSpinning: false,
        isWaiting: false,
      };
    }

    case "WAITING_FOR_BETS": {
      const { payload } = action;
      return {
        ...state,
        roundId: payload.roundId,
        phase: payload.phase,
        timeRemaining: 0,
        bettingTriggeredBy: null,
        canBet: true,
        isSpinning: false,
        isWaiting: true,
        // Clear bets and results for new round
        yourBets: [],
        yourTotalBet: 0,
        spinResult: null,
        allPlayerResults: [],
        yourResult: null,
        // Clear player bets
        players: state.players.map((p) => ({ ...p, bets: [], totalBet: 0 })),
      };
    }

    case "ROUND_COUNTDOWN":
      return {
        ...state,
        phase: action.payload.phase,
        timeRemaining: action.payload.timeRemaining,
        canBet:
          action.payload.phase === "waiting" ||
          action.payload.phase === "betting",
        isSpinning: action.payload.phase === "spinning",
        isWaiting: action.payload.phase === "waiting",
      };

    case "SPIN_STARTING":
      return {
        ...state,
        phase: "spinning",
        canBet: false,
        isSpinning: true,
        isWaiting: false,
      };

    case "SPIN_RESULT": {
      const { payload } = action;
      return {
        ...state,
        phase: "results",
        timeRemaining: payload.timeUntilNextRound,
        spinResult: payload.spinResult,
        allPlayerResults: payload.allPlayerResults,
        yourResult: payload.yourResult || null,
        yourBalance: payload.yourResult?.newBalance ?? state.yourBalance,
        canBet: false,
        isSpinning: false,
        isWaiting: false,
        lastWinningNumber: payload.spinResult.winningNumber,
      };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// Context types
interface MultiplayerContextType {
  state: MultiplayerState;
  connect: () => void;
  disconnect: () => void;
  placeBet: (bet: {
    type: string;
    value?: string | number;
    amount: number;
    numbers?: number[];
  }) => void;
  removeBet: (betIndex: number) => void;
  clearBets: () => void;
}

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

// Provider props
interface MultiplayerProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

// Provider component
export function RouletteMultiplayerProvider({
  children,
  autoConnect = false,
}: MultiplayerProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // WebSocket callbacks
  const handleRoomState = useCallback((payload: RoomStatePayload) => {
    dispatch({ type: "SET_ROOM_STATE", payload });
  }, []);

  const handlePlayerJoined = useCallback((payload: PlayerJoinedPayload) => {
    dispatch({ type: "PLAYER_JOINED", payload });
  }, []);

  const handlePlayerLeft = useCallback((payload: PlayerLeftPayload) => {
    dispatch({ type: "PLAYER_LEFT", payload });
  }, []);

  const handleBetPlaced = useCallback((payload: BetPlacedPayload) => {
    dispatch({ type: "BET_PLACED", payload });
  }, []);

  const handleBetRemoved = useCallback((payload: BetRemovedPayload) => {
    dispatch({ type: "BET_REMOVED", payload });
  }, []);

  const handleBetsCleared = useCallback((payload: BetsClearedPayload) => {
    dispatch({ type: "BETS_CLEARED", payload });
  }, []);

  const handleBettingStarted = useCallback((payload: BettingStartedPayload) => {
    dispatch({ type: "BETTING_STARTED", payload });
  }, []);

  const handleWaitingForBets = useCallback((payload: WaitingForBetsPayload) => {
    dispatch({ type: "WAITING_FOR_BETS", payload });
  }, []);

  const handleRoundCountdown = useCallback((payload: RoundCountdownPayload) => {
    dispatch({ type: "ROUND_COUNTDOWN", payload });
  }, []);

  const handleSpinStarting = useCallback((payload: SpinStartingPayload) => {
    dispatch({ type: "SPIN_STARTING", payload });
  }, []);

  const handleSpinResult = useCallback((payload: SpinResultPayload) => {
    dispatch({ type: "SPIN_RESULT", payload });
  }, []);

  const handleError = useCallback((payload: ErrorPayload) => {
    dispatch({ type: "SET_ERROR", payload: payload.message });
    dispatch({ type: "SET_CONNECTING", payload: false });
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    dispatch({ type: "SET_CONNECTED", payload: connected });
  }, []);

  // Setup WebSocket hook
  const ws = useRouletteWebSocket({
    onRoomState: handleRoomState,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onBetPlaced: handleBetPlaced,
    onBetRemoved: handleBetRemoved,
    onBetsCleared: handleBetsCleared,
    onBettingStarted: handleBettingStarted,
    onWaitingForBets: handleWaitingForBets,
    onRoundCountdown: handleRoundCountdown,
    onSpinStarting: handleSpinStarting,
    onSpinResult: handleSpinResult,
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
      // Add a small delay to ensure token is loaded
      const timer = setTimeout(() => {
        connect();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // Context value
  const contextValue = useMemo<MultiplayerContextType>(
    () => ({
      state,
      connect,
      disconnect: ws.disconnect,
      placeBet: ws.placeBet,
      removeBet: ws.removeBet,
      clearBets: ws.clearBets,
    }),
    [state, connect, ws.disconnect, ws.placeBet, ws.removeBet, ws.clearBets]
  );

  return (
    <MultiplayerContext.Provider value={contextValue}>
      {children}
    </MultiplayerContext.Provider>
  );
}

// Hook to use the context
export function useRouletteMultiplayer() {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error(
      "useRouletteMultiplayer must be used within a RouletteMultiplayerProvider"
    );
  }
  return context;
}

// Export types
export type {
  MultiplayerState,
  Bet,
  PlayerInfo,
  SpinResult,
  PlayerResult,
  YourResult,
};
