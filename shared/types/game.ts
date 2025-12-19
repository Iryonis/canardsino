enum GameName {
    ROULETTE = "Roulette",
    BLACKJACK = "Blackjack",
    POKER = "Poker",
    SLOTS = "Slots",
}

export interface Game {
    id: string;
    gameName: GameName;
    playedAt: Date;
    betAmount: number;
    resultAmount: number;
    win: boolean; 
}