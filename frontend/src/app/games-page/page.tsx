"use client";

import { Navbar } from "@/components/navbar/navbar";
import GamesCard from "@/components/games/games_card";

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-blue-darkest">
      <Navbar balance={0} currentPage="Games" />
      <div className="container flex flex-row gap-4 p-4 mx-auto mt-8 flex-wrap">
        <GamesCard
          name="European Roulette"
          img="/assets/img/roulette.png"
          price={10}
          mode="Single Player"
          url="/roulette"
        />
        <GamesCard
          name="Soon Available Game"
          img=""
          price={0}
          mode="/"
          url="/"
        />
        <GamesCard
          name="Soon Available Game"
          img=""
          price={0}
          mode="/"
          url="/"
        />
        <GamesCard
          name="Soon Available Game"
          img=""
          price={0}
          mode="/"
          url="/"
        />
      </div>
    </div>
  );
}
