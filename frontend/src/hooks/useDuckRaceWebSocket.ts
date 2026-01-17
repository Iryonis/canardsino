/**
 * WebSocket hook for Duck Race multiplayer game
 * Manages WebSocket connection, reconnection, and message handling
 * Supports lobby-based room system
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { tokenManager } from "@/lib/tokenManager";

// Game phase types
export type DuckRacePhase =
  | "waiting"
  | "betting"
  | "countdown"
  | "racing"
  | "finished";

// Duck colors
export type DuckColor = "yellow" | "orange" | "blue" | "green" | "pink";

// Player info
export interface DuckPlayer {
  userId: string;
  username: string;
  hasBet: boolean;
  isReady: boolean;
  position: number;
  lane: number;
  color: DuckColor;
  isConnected: boolean;
}

// Room info for lobby
export interface RoomInfo {
  roomId: string;
  roomName: string;
  creatorId: string;
  creatorUsername: string;
  betAmount: number;
  playerCount: number;
  maxPlayers: number;
  isPersistent: boolean;
  phase: DuckRacePhase;
  readyCount: number;
}

// Server message payloads
export interface RoomListPayload {
  rooms: RoomInfo[];
  yourBalance?: number;
}

export interface RoomCreatedPayload {
  room: RoomInfo;
}

export interface RoomUpdatedPayload {
  room: RoomInfo;
}

export interface RoomDeletedPayload {
  roomId: string;
}

export interface RaceStatePayload {
  roomId: string;
  roomName: string;
  roundId: string;
  phase: DuckRacePhase;
  timeRemaining: number;
  betAmount: number;
  totalPot: number;
  creatorId: string;
  creatorUsername: string;
  isPersistent: boolean;
  players: DuckPlayer[];
  yourBalance: number;
  yourIsReady: boolean;
  yourLane?: number;
}

export interface DuckPlayerJoinedPayload {
  userId: string;
  username: string;
  lane: number;
  color: DuckColor;
  playerCount: number;
  isReady: boolean;
}

export interface DuckPlayerLeftPayload {
  userId: string;
  username: string;
  playerCount: number;
  refunded?: boolean;
}

export interface PlayerReadyPayload {
  userId: string;
  username: string;
  isReady: boolean;
  readyCount: number;
  totalPlayers: number;
}

export interface AllReadyPayload {
  message: string;
}

export interface CountdownTickPayload {
  phase: "countdown";
  timeRemaining: number;
}

export interface RaceStartedPayload {
  roundId: string;
  phase: "racing";
  totalPot: number;
  players: Array<{
    userId: string;
    username: string;
    lane: number;
    color: DuckColor;
  }>;
}

export interface RaceUpdatePayload {
  positions: Array<{
    userId: string;
    position: number;
    advance: number;
  }>;
  leaderId: string;
}

export interface RaceFinishedPayload {
  roundId: string;
  phase: "finished";
  winner: {
    userId: string;
    username: string;
    lane: number;
    color: DuckColor;
    winnings: number;
  };
  finalPositions: Array<{
    userId: string;
    username: string;
    position: number;
    lane: number;
    rank: number;
  }>;
  totalPot: number;
  yourResult?: {
    rank: number;
    betAmount: number;
    winnings: number;
    netResult: number;
    newBalance: number;
  };
  timeUntilNextRace: number;
}

export interface WaitingForPlayersPayload {
  roundId: string;
  phase: "waiting";
  playerCount: number;
  minPlayers: number;
  message: string;
}

export interface DuckBalanceUpdatePayload {
  balance: number;
  reason: "bet_placed" | "win_credited" | "refund";
}

export interface DuckErrorPayload {
  code: string;
  message: string;
}

// Server message union type
export type DuckRaceServerMessage =
  | { type: "ROOM_LIST"; payload: RoomListPayload; timestamp: number }
  | { type: "ROOM_CREATED"; payload: RoomCreatedPayload; timestamp: number }
  | { type: "ROOM_UPDATED"; payload: RoomUpdatedPayload; timestamp: number }
  | { type: "ROOM_DELETED"; payload: RoomDeletedPayload; timestamp: number }
  | { type: "RACE_STATE"; payload: RaceStatePayload; timestamp: number }
  | {
      type: "PLAYER_JOINED";
      payload: DuckPlayerJoinedPayload;
      timestamp: number;
    }
  | { type: "PLAYER_LEFT"; payload: DuckPlayerLeftPayload; timestamp: number }
  | { type: "PLAYER_READY"; payload: PlayerReadyPayload; timestamp: number }
  | { type: "ALL_READY"; payload: AllReadyPayload; timestamp: number }
  | { type: "COUNTDOWN_TICK"; payload: CountdownTickPayload; timestamp: number }
  | { type: "RACE_STARTED"; payload: RaceStartedPayload; timestamp: number }
  | { type: "RACE_UPDATE"; payload: RaceUpdatePayload; timestamp: number }
  | { type: "RACE_FINISHED"; payload: RaceFinishedPayload; timestamp: number }
  | {
      type: "WAITING_FOR_PLAYERS";
      payload: WaitingForPlayersPayload;
      timestamp: number;
    }
  | {
      type: "BALANCE_UPDATE";
      payload: DuckBalanceUpdatePayload;
      timestamp: number;
    }
  | { type: "ERROR"; payload: DuckErrorPayload; timestamp: number }
  | { type: "PONG"; timestamp: number };

// Client message types
export type DuckRaceClientMessage =
  | { type: "GET_ROOMS" }
  | {
      type: "CREATE_ROOM";
      payload: { betAmount: number; isPersistent: boolean; roomName?: string };
    }
  | { type: "JOIN_ROOM"; payload: { roomId: string } }
  | { type: "LEAVE_ROOM" }
  | { type: "SET_READY"; payload: { isReady: boolean } }
  | { type: "PING" };

// Hook options
export interface UseDuckRaceWebSocketOptions {
  onRoomList?: (payload: RoomListPayload) => void;
  onRoomCreated?: (payload: RoomCreatedPayload) => void;
  onRoomUpdated?: (payload: RoomUpdatedPayload) => void;
  onRoomDeleted?: (payload: RoomDeletedPayload) => void;
  onRaceState?: (payload: RaceStatePayload) => void;
  onPlayerJoined?: (payload: DuckPlayerJoinedPayload) => void;
  onPlayerLeft?: (payload: DuckPlayerLeftPayload) => void;
  onPlayerReady?: (payload: PlayerReadyPayload) => void;
  onAllReady?: (payload: AllReadyPayload) => void;
  onCountdownTick?: (payload: CountdownTickPayload) => void;
  onRaceStarted?: (payload: RaceStartedPayload) => void;
  onRaceUpdate?: (payload: RaceUpdatePayload) => void;
  onRaceFinished?: (payload: RaceFinishedPayload) => void;
  onWaitingForPlayers?: (payload: WaitingForPlayersPayload) => void;
  onBalanceUpdate?: (payload: DuckBalanceUpdatePayload) => void;
  onError?: (payload: DuckErrorPayload) => void;
  onConnectionChange?: (connected: boolean) => void;
}

// Hook return type
export interface UseDuckRaceWebSocketReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  getRooms: () => void;
  createRoom: (
    betAmount: number,
    isPersistent: boolean,
    roomName?: string,
  ) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
}

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/games/duck-race/ws`
    : "";

const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const PING_INTERVAL = 30000;
const TOKEN_RETRY_DELAY = 100; // Retry getting token after 100ms if not available
const TOKEN_MAX_RETRIES = 50; // Max 5 seconds of retries

export function useDuckRaceWebSocket(
  options: UseDuckRaceWebSocketOptions = {},
): UseDuckRaceWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY);
  const manualDisconnectRef = useRef(false);
  const tokenRetryCountRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in refs to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

  const sendMessage = useCallback((message: DuckRaceClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: DuckRaceServerMessage = JSON.parse(event.data);
      const opts = optionsRef.current;

      switch (message.type) {
        case "ROOM_LIST":
          opts.onRoomList?.(message.payload);
          break;
        case "ROOM_CREATED":
          opts.onRoomCreated?.(message.payload);
          break;
        case "ROOM_UPDATED":
          opts.onRoomUpdated?.(message.payload);
          break;
        case "ROOM_DELETED":
          opts.onRoomDeleted?.(message.payload);
          break;
        case "RACE_STATE":
          opts.onRaceState?.(message.payload);
          break;
        case "PLAYER_JOINED":
          opts.onPlayerJoined?.(message.payload);
          break;
        case "PLAYER_LEFT":
          opts.onPlayerLeft?.(message.payload);
          break;
        case "PLAYER_READY":
          opts.onPlayerReady?.(message.payload);
          break;
        case "ALL_READY":
          opts.onAllReady?.(message.payload);
          break;
        case "COUNTDOWN_TICK":
          opts.onCountdownTick?.(message.payload);
          break;
        case "RACE_STARTED":
          opts.onRaceStarted?.(message.payload);
          break;
        case "RACE_UPDATE":
          opts.onRaceUpdate?.(message.payload);
          break;
        case "RACE_FINISHED":
          opts.onRaceFinished?.(message.payload);
          break;
        case "WAITING_FOR_PLAYERS":
          opts.onWaitingForPlayers?.(message.payload);
          break;
        case "BALANCE_UPDATE":
          opts.onBalanceUpdate?.(message.payload);
          break;
        case "ERROR":
          opts.onError?.(message.payload);
          break;
        case "PONG":
          // Heartbeat received
          break;
      }
    } catch (error) {
      console.error("Error parsing Duck Race WebSocket message:", error);
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
      // Retry getting token after a delay if not available
      if (tokenRetryCountRef.current < TOKEN_MAX_RETRIES) {
        tokenRetryCountRef.current++;
        console.warn(
          `No access token yet for Duck Race WebSocket, retrying... (${tokenRetryCountRef.current}/${TOKEN_MAX_RETRIES})`,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, TOKEN_RETRY_DELAY);
        return;
      }
      console.error(
        "No access token available for Duck Race WebSocket connection after retries",
      );
      optionsRef.current.onError?.({
        code: "AUTH_ERROR",
        message: "No access token available",
      });
      return;
    }

    // Reset retry counter on successful token retrieval
    tokenRetryCountRef.current = 0;

    manualDisconnectRef.current = false;

    const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;
    console.log("Duck Race connecting to:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      console.log("Duck Race WebSocket created, readyState:", ws.readyState);

      ws.onopen = () => {
        console.log("Duck Race WebSocket connected");
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
        console.log("Duck Race WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        optionsRef.current.onConnectionChange?.(false);
        clearTimers();

        // Reconnect unless manually disconnected
        if (!manualDisconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Reconnecting Duck Race in ${reconnectDelayRef.current}ms...`,
            );
            connect();
            // Exponential backoff
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * 2,
              MAX_RECONNECT_DELAY,
            );
          }, reconnectDelayRef.current);
        }
      };

      ws.onerror = (error) => {
        console.error("Duck Race WebSocket error:", error);
      };
    } catch (err) {
      console.error("Duck Race WebSocket creation error:", err);
    }
  }, [handleMessage, sendMessage, clearTimers]);

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearTimers();

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearTimers]);

  const getRooms = useCallback(() => {
    sendMessage({ type: "GET_ROOMS" });
  }, [sendMessage]);

  const createRoom = useCallback(
    (betAmount: number, isPersistent: boolean, roomName?: string) => {
      sendMessage({
        type: "CREATE_ROOM",
        payload: { betAmount, isPersistent, roomName },
      });
    },
    [sendMessage],
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      sendMessage({
        type: "JOIN_ROOM",
        payload: { roomId },
      });
    },
    [sendMessage],
  );

  const leaveRoom = useCallback(() => {
    sendMessage({ type: "LEAVE_ROOM" });
  }, [sendMessage]);

  const setReady = useCallback(
    (isReady: boolean) => {
      sendMessage({
        type: "SET_READY",
        payload: { isReady },
      });
    },
    [sendMessage],
  );

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
    getRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
  };
}
