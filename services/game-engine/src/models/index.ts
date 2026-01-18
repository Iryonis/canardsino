/**
 * Models index - exports all database models
 */

export { BigWin, IBigWin } from "./BigWin";
export { GameSession, IGameSession, ISessionPlayer } from "./GameSession";
export {
  GameHistory,
  IGameHistory,
  IGameBet,
  IRouletteDetails,
} from "./GameHistory";
export {
  DuckRaceHistory,
  IDuckRaceHistory,
  IDuckRaceParticipant,
} from "./DuckRaceHistory";
