/**
 * Duck Race Context
 * Manages multiplayer duck race game state via WebSocket
 * Supports lobby-based room system with ready mechanics
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
  type RoomInfo,
  type RoomListPayload,
  type RoomCreatedPayload,
  type RoomUpdatedPayload,
  type RoomDeletedPayload,
  type RaceStatePayload,
  type DuckPlayerJoinedPayload,
  type DuckPlayerLeftPayload,
  type PlayerReadyPayload,
  type AllReadyPayload,
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

  // Lobby state
  isInLobby: boolean;
  rooms: RoomInfo[];

  // Room state
  roomId: string;
  roomName: string;
  roundId: string;
  phase: DuckRacePhase;
  timeRemaining: number;
  creatorId: string;
  creatorUsername: string;
  isPersistent: boolean;

  // Race state
  betAmount: number;
  totalPot: number;
  players: DuckPlayer[];
  playerCount: number;

  // Your state
  yourBalance: number;
  yourIsReady: boolean;
  yourLane: number | null;

  // Ready counts
  readyCount: number;

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

  // Leader during race
  leaderId: string | null;

  // UI helpers
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
  | { type: "SET_ROOM_LIST"; payload: RoomListPayload }
  | { type: "ROOM_CREATED"; payload: RoomCreatedPayload }
  | { type: "ROOM_UPDATED"; payload: RoomUpdatedPayload }
  | { type: "ROOM_DELETED"; payload: RoomDeletedPayload }
  | { type: "SET_RACE_STATE"; payload: RaceStatePayload }
  | { type: "PLAYER_JOINED"; payload: DuckPlayerJoinedPayload }
  | { type: "PLAYER_LEFT"; payload: DuckPlayerLeftPayload }
  | { type: "PLAYER_READY"; payload: PlayerReadyPayload }
  | { type: "ALL_READY"; payload: AllReadyPayload }
  | { type: "COUNTDOWN_TICK"; payload: CountdownTickPayload }
  | { type: "RACE_STARTED"; payload: RaceStartedPayload }
  | { type: "RACE_UPDATE"; payload: RaceUpdatePayload }
  | { type: "RACE_FINISHED"; payload: RaceFinishedPayload }
  | { type: "WAITING_FOR_PLAYERS"; payload: WaitingForPlayersPayload }
  | { type: "BALANCE_UPDATE"; payload: DuckBalanceUpdatePayload }
  | { type: "GO_TO_LOBBY" }
  | { type: "RESET" };

// Initial state
const initialState: DuckRaceState = {
  isConnected: false,
  isConnecting: false,
  error: null,
  isInLobby: true,
  rooms: [],
  roomId: "",
  roomName: "",
  roundId: "",
  phase: "waiting",
  timeRemaining: 0,
  creatorId: "",
  creatorUsername: "",
  isPersistent: false,
  betAmount: 0,
  totalPot: 0,
  players: [],
  playerCount: 0,
  yourBalance: 0,
  yourIsReady: false,
  yourLane: null,
  readyCount: 0,
  winner: null,
  yourResult: null,
  finalPositions: [],
  leaderId: null,
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

    case "SET_ROOM_LIST": {
      const { payload } = action;
      return {
        ...state,
        rooms: payload.rooms,
        isInLobby: true,
        yourBalance: payload.yourBalance ?? state.yourBalance,
      };
    }

    case "ROOM_CREATED": {
      const { payload } = action;
      // Add the new room to the list if we're in lobby
      if (state.isInLobby) {
        return {
          ...state,
          rooms: [...state.rooms, payload.room],
        };
      }
      return state;
    }

    case "ROOM_UPDATED": {
      const { payload } = action;
      // Update the room in the list if we're in lobby
      if (state.isInLobby) {
        return {
          ...state,
          rooms: state.rooms.map((r) =>
            r.roomId === payload.room.roomId ? payload.room : r
          ),
        };
      }
      return state;
    }

    case "ROOM_DELETED": {
      const { payload } = action;
      // Remove the room from the list if we're in lobby
      if (state.isInLobby) {
        return {
          ...state,
          rooms: state.rooms.filter((r) => r.roomId !== payload.roomId),
        };
      }
      return state;
    }

    case "SET_RACE_STATE": {
      const { payload } = action;
      const readyCount = payload.players.filter((p) => p.isReady).length;
      return {
        ...state,
        isInLobby: false,
        roomId: payload.roomId,
        roomName: payload.roomName,
        roundId: payload.roundId,
        phase: payload.phase,
        timeRemaining: payload.timeRemaining,
        betAmount: payload.betAmount,
        totalPot: payload.totalPot,
        creatorId: payload.creatorId,
        creatorUsername: payload.creatorUsername,
        isPersistent: payload.isPersistent,
        players: payload.players,
        playerCount: payload.players.length,
        yourBalance: payload.yourBalance,
        yourIsReady: payload.yourIsReady,
        yourLane: payload.yourLane ?? null,
        readyCount,
        isRacing: payload.phase === "racing",
        isCountdown: payload.phase === "countdown",
        isWaiting: payload.phase === "waiting",
        isFinished: payload.phase === "finished",
        // Clear results when joining/reconnecting
        winner: null,
        yourResult: null,
        finalPositions: [],
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
            isReady: payload.isReady,
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
      const updatedPlayers = state.players.filter((p) => p.userId !== payload.userId);
      const readyCount = updatedPlayers.filter((p) => p.isReady).length;
      return {
        ...state,
        players: updatedPlayers,
        playerCount: payload.playerCount,
        readyCount,
      };
    }

    case "PLAYER_READY": {
      const { payload } = action;
      const updatedPlayers = state.players.map((p) => {
        if (p.userId === payload.userId) {
          return { ...p, isReady: payload.isReady };
        }
        return p;
      });
      return {
        ...state,
        players: updatedPlayers,
        readyCount: payload.readyCount,
      };
    }

    case "ALL_READY":
      // All players are ready, countdown will start
      return state;

    case "COUNTDOWN_TICK":
      return {
        ...state,
        phase: "countdown",
        timeRemaining: action.payload.timeRemaining,
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
        isRacing: true,
        isCountdown: false,
        isWaiting: false,
        isFinished: false,
        // Reset positions and mark all as having bet
        players: state.players.map((p) => ({ ...p, position: 0, hasBet: true })),
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
        totalPot: 0,
        isRacing: false,
        isCountdown: false,
        isWaiting: true,
        isFinished: false,
        // Reset player state but keep players in room
        yourIsReady: false,
        readyCount: 0,
        winner: null,
        yourResult: null,
        finalPositions: [],
        leaderId: null,
        players: state.players.map((p) => ({
          ...p,
          hasBet: false,
          isReady: false,
          position: 0,
        })),
      };
    }

    case "BALANCE_UPDATE":
      return {
        ...state,
        yourBalance: action.payload.balance,
      };

    case "GO_TO_LOBBY":
      return {
        ...state,
        isInLobby: true,
        roomId: "",
        roomName: "",
        players: [],
        yourIsReady: false,
        yourLane: null,
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
  getRooms: () => void;
  createRoom: (betAmount: number, isPersistent: boolean, roomName?: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
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
  const handleRoomList = useCallback((payload: RoomListPayload) => {
    dispatch({ type: "SET_ROOM_LIST", payload });
  }, []);

  const handleRoomCreated = useCallback((payload: RoomCreatedPayload) => {
    dispatch({ type: "ROOM_CREATED", payload });
  }, []);

  const handleRoomUpdated = useCallback((payload: RoomUpdatedPayload) => {
    dispatch({ type: "ROOM_UPDATED", payload });
  }, []);

  const handleRoomDeleted = useCallback((payload: RoomDeletedPayload) => {
    dispatch({ type: "ROOM_DELETED", payload });
  }, []);

  const handleRaceState = useCallback((payload: RaceStatePayload) => {
    dispatch({ type: "SET_RACE_STATE", payload });
  }, []);

  const handlePlayerJoined = useCallback((payload: DuckPlayerJoinedPayload) => {
    dispatch({ type: "PLAYER_JOINED", payload });
  }, []);

  const handlePlayerLeft = useCallback((payload: DuckPlayerLeftPayload) => {
    dispatch({ type: "PLAYER_LEFT", payload });
  }, []);

  const handlePlayerReady = useCallback((payload: PlayerReadyPayload) => {
    dispatch({ type: "PLAYER_READY", payload });
  }, []);

  const handleAllReady = useCallback((payload: AllReadyPayload) => {
    dispatch({ type: "ALL_READY", payload });
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
    onRoomList: handleRoomList,
    onRoomCreated: handleRoomCreated,
    onRoomUpdated: handleRoomUpdated,
    onRoomDeleted: handleRoomDeleted,
    onRaceState: handleRaceState,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
    onPlayerReady: handlePlayerReady,
    onAllReady: handleAllReady,
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

  // Leave room and go to lobby
  const leaveRoom = useCallback(() => {
    ws.leaveRoom();
    dispatch({ type: "GO_TO_LOBBY" });
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
      getRooms: ws.getRooms,
      createRoom: ws.createRoom,
      joinRoom: ws.joinRoom,
      leaveRoom,
      setReady: ws.setReady,
    }),
    [state, connect, ws.disconnect, ws.getRooms, ws.createRoom, ws.joinRoom, leaveRoom, ws.setReady]
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
export type { DuckRaceState, DuckPlayer, DuckColor, DuckRacePhase, RoomInfo };
