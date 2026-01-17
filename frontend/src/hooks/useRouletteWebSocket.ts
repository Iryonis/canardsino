/**
 * WebSocket hook for multiplayer roulette
 * Manages WebSocket connection, reconnection, and message handling
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { tokenManager } from "@/lib/tokenManager";

// Message types from backend
export type RoundPhase = "waiting" | "betting" | "spinning" | "results";

export interface Bet {
  type: string;
  numbers: number[];
  amount: number;
}

export interface PlayerInfo {
  userId: string;
  username: string;
  bets: Bet[];
  totalBet: number;
  isConnected: boolean;
  isLocked: boolean;
}

export interface SpinResult {
  winningNumber: number;
  color: "red" | "black" | "green";
  parity: "even" | "odd" | "zero";
  range: "low" | "high" | "zero";
  column?: number;
  dozen?: number;
}

export interface PlayerResult {
  userId: string;
  username: string;
  bets: Bet[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  winningBetsCount: number;
}

export interface YourResult {
  bets: Bet[];
  totalBet: number;
  totalWin: number;
  netResult: number;
  winningBets: Array<{ bet: Bet; payout: number }>;
  newBalance: number;
}

// Server message payloads
export interface RoomStatePayload {
  roomId: string;
  roundId: string;
  phase: RoundPhase;
  timeRemaining: number;
  players: PlayerInfo[];
  yourBets: Bet[];
  yourBalance: number;
  yourUserId: string;
}

export interface PlayerJoinedPayload {
  userId: string;
  username: string;
  playerCount: number;
}

export interface PlayerLeftPayload {
  userId: string;
  username: string;
  playerCount: number;
}

export interface PlayerLockedPayload {
  userId: string;
  username: string;
}

export interface BetPlacedPayload {
  userId: string;
  username: string;
  bet: Bet;
  totalBet: number;
  newBalance?: number;
}

export interface BetRemovedPayload {
  userId: string;
  username: string;
  betIndex: number;
  removedBet: Bet;
  totalBet: number;
  newBalance?: number;
}

export interface BetsClearedPayload {
  userId: string;
  username: string;
  newBalance?: number;
}

export interface BettingStartedPayload {
  roundId: string;
  phase: "betting";
  timeRemaining: number;
  triggeredBy: {
    userId: string;
    username: string;
  };
}

export interface WaitingForBetsPayload {
  roundId: string;
  phase: "waiting";
  message: string;
}

export interface RoundCountdownPayload {
  phase: RoundPhase;
  timeRemaining: number;
}

export interface SpinStartingPayload {
  roundId: string;
  phase: "spinning";
  totalBetsAllPlayers: number;
  playersWithBets: number;
  winningNumber: number;
}

export interface SpinResultPayload {
  roundId: string;
  phase: "results";
  spinResult: SpinResult;
  allPlayerResults: PlayerResult[];
  yourResult?: YourResult;
  timeUntilNextRound: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export type ServerMessage =
  | { type: "ROOM_STATE"; payload: RoomStatePayload; timestamp: number }
  | { type: "PLAYER_JOINED"; payload: PlayerJoinedPayload; timestamp: number }
  | { type: "PLAYER_LEFT"; payload: PlayerLeftPayload; timestamp: number }
  | { type: "PLAYER_LOCKED"; payload: PlayerLockedPayload; timestamp: number }
  | { type: "BET_PLACED"; payload: BetPlacedPayload; timestamp: number }
  | { type: "BET_REMOVED"; payload: BetRemovedPayload; timestamp: number }
  | { type: "BETS_CLEARED"; payload: BetsClearedPayload; timestamp: number }
  | {
      type: "BETTING_STARTED";
      payload: BettingStartedPayload;
      timestamp: number;
    }
  | {
      type: "WAITING_FOR_BETS";
      payload: WaitingForBetsPayload;
      timestamp: number;
    }
  | {
      type: "ROUND_COUNTDOWN";
      payload: RoundCountdownPayload;
      timestamp: number;
    }
  | { type: "SPIN_STARTING"; payload: SpinStartingPayload; timestamp: number }
  | { type: "SPIN_RESULT"; payload: SpinResultPayload; timestamp: number }
  | { type: "ERROR"; payload: ErrorPayload; timestamp: number }
  | { type: "PONG"; timestamp: number };

// Client message types
export type ClientMessage =
  | { type: "JOIN_ROOM"; payload?: { roomId?: string } }
  | { type: "LEAVE_ROOM"; payload?: { roomId?: string } }
  | {
      type: "PLACE_BET";
      payload: {
        type: string;
        value?: string | number;
        amount: number;
        numbers?: number[];
      };
    }
  | { type: "REMOVE_BET"; payload: { betIndex: number } }
  | { type: "CLEAR_BETS" }
  | { type: "LOCK_BETS" }
  | { type: "PING" };

export interface UseRouletteWebSocketOptions {
  onRoomState?: (payload: RoomStatePayload) => void;
  onPlayerJoined?: (payload: PlayerJoinedPayload) => void;
  onPlayerLeft?: (payload: PlayerLeftPayload) => void;
  onPlayerLocked?: (payload: PlayerLockedPayload) => void;
  onBetPlaced?: (payload: BetPlacedPayload) => void;
  onBetRemoved?: (payload: BetRemovedPayload) => void;
  onBetsCleared?: (payload: BetsClearedPayload) => void;
  onBettingStarted?: (payload: BettingStartedPayload) => void;
  onWaitingForBets?: (payload: WaitingForBetsPayload) => void;
  onRoundCountdown?: (payload: RoundCountdownPayload) => void;
  onSpinStarting?: (payload: SpinStartingPayload) => void;
  onSpinResult?: (payload: SpinResultPayload) => void;
  onError?: (payload: ErrorPayload) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface UseRouletteWebSocketReturn {
  isConnected: boolean;
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
  lockBets: () => void;
  joinRoom: (roomId?: string) => void;
  leaveRoom: () => void;
}

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        window.location.host
      }/api/games/roulette/ws`
    : "";

const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 30000;

export function useRouletteWebSocket(
  options: UseRouletteWebSocketOptions = {},
): UseRouletteWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY);
  const manualDisconnectRef = useRef(false);
  const connectRef = useRef<(() => void) | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid stale closures
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);
      const opts = optionsRef.current;

      switch (message.type) {
        case "ROOM_STATE":
          opts.onRoomState?.(message.payload);
          break;
        case "PLAYER_JOINED":
          opts.onPlayerJoined?.(message.payload);
          break;
        case "PLAYER_LEFT":
          opts.onPlayerLeft?.(message.payload);
          break;
        case "PLAYER_LOCKED":
          opts.onPlayerLocked?.(message.payload);
          break;
        case "BET_PLACED":
          opts.onBetPlaced?.(message.payload);
          break;
        case "BET_REMOVED":
          opts.onBetRemoved?.(message.payload);
          break;
        case "BETS_CLEARED":
          opts.onBetsCleared?.(message.payload);
          break;
        case "BETTING_STARTED":
          opts.onBettingStarted?.(message.payload);
          break;
        case "WAITING_FOR_BETS":
          opts.onWaitingForBets?.(message.payload);
          break;
        case "ROUND_COUNTDOWN":
          opts.onRoundCountdown?.(message.payload);
          break;
        case "SPIN_STARTING":
          opts.onSpinStarting?.(message.payload);
          break;
        case "SPIN_RESULT":
          opts.onSpinResult?.(message.payload);
          break;
        case "ERROR":
          opts.onError?.(message.payload);
          break;
        case "PONG":
          // Heartbeat received
          break;
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }, []);

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // Get token
    const token = tokenManager.getAccessToken();
    if (!token) {
      console.error("No access token available for WebSocket connection");
      optionsRef.current.onError?.({
        code: "AUTH_ERROR",
        message: "No access token available for WebSocket connection",
      });
      return;
    }

    manualDisconnectRef.current = false;

    const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      optionsRef.current.onConnectionChange?.(true);
      reconnectDelayRef.current = RECONNECT_DELAY;

      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        sendMessage({ type: "PING" });
      }, PING_INTERVAL);
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      console.log(
        `WebSocket closed: code=${event.code}, reason=${event.reason}, wasClean=${event.wasClean}`,
      );
      setIsConnected(false);
      optionsRef.current.onConnectionChange?.(false);
      clearTimers();

      // Reconnect unless manually disconnected
      if (!manualDisconnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnecting in ${reconnectDelayRef.current}ms...`);
          if (connectRef.current) {
            connectRef.current();
          }
          // Exponential backoff
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_DELAY,
          );
        }, reconnectDelayRef.current);
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error - Event:", event);
      if (wsRef.current) {
        console.error(
          "WebSocket error - State:",
          wsRef.current.readyState,
          "URL:",
          wsRef.current.url,
        );
      }
    };
  }, [handleMessage, sendMessage, clearTimers]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearTimers();

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearTimers]);

  const placeBet = useCallback(
    (bet: {
      type: string;
      value?: string | number;
      amount: number;
      numbers?: number[];
    }) => {
      sendMessage({
        type: "PLACE_BET",
        payload: bet,
      });
    },
    [sendMessage],
  );

  const removeBet = useCallback(
    (betIndex: number) => {
      sendMessage({
        type: "REMOVE_BET",
        payload: { betIndex },
      });
    },
    [sendMessage],
  );

  const clearBets = useCallback(() => {
    sendMessage({ type: "CLEAR_BETS" });
  }, [sendMessage]);

  const lockBets = useCallback(() => {
    sendMessage({ type: "LOCK_BETS" });
  }, [sendMessage]);

  const joinRoom = useCallback(
    (roomId?: string) => {
      sendMessage({
        type: "JOIN_ROOM",
        payload: roomId ? { roomId } : undefined,
      });
    },
    [sendMessage],
  );

  const leaveRoom = useCallback(() => {
    sendMessage({ type: "LEAVE_ROOM" });
  }, [sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    placeBet,
    removeBet,
    clearBets,
    lockBets,
    joinRoom,
    leaveRoom,
  };
}
