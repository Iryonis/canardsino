/**
 * WebSocket module exports
 */

export { WebSocketServerHandler } from "./WebSocketServer";
export { GameRoundManager } from "./GameRoundManager";
export * from "./types";

// Duck Race exports
export { DuckRaceWebSocketServer } from "./DuckRaceWebSocketServer";
export { DuckRaceManager } from "./DuckRaceManager";
// Re-export duckRaceTypes excluding conflicting names
export {
  DUCK_RACE_CONFIG,
  DUCK_COLORS,
  type DuckRacePhase,
  type DuckPlayer,
  type DuckColor,
  type DuckRaceRound,
  type RaceSnapshot,
  type RoomInfo,
  type DuckRaceClientMessageType,
  type GetRoomsPayload,
  type CreateRoomPayload,
  type SetReadyPayload,
  type DuckRaceClientMessage,
  type DuckRaceServerMessageType,
  type RoomListPayload,
  type RoomCreatedPayload,
  type RoomUpdatedPayload,
  type RoomDeletedPayload,
  type PlayerReadyPayload,
  type AllReadyPayload,
  type RaceStatePayload,
  type DuckPlayerJoinedPayload,
  type DuckPlayerLeftPayload,
  type CountdownTickPayload,
  type RaceStartedPayload,
  type RaceUpdatePayload,
  type RaceFinishedPayload,
  type WaitingForPlayersPayload,
  type DuckBalanceUpdatePayload,
  type DuckErrorPayload,
  type DuckRaceServerMessage,
  type DuckRaceAuthenticatedWebSocket,
} from "./duckRaceTypes";
