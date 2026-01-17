"use client";

import GamesCard from "@/components/games/games_card";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/navbar/navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getWalletBalance } from "@/lib/gameApi";

export default function GamesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      console.log("🔒 Not authenticated, redirecting to login...");
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      getWalletBalance()
        .then((bal) => setBalance(bal.balance))
        .catch((err) => console.error("Error fetching balance:", err));
    }
  }, [isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-blue-darkest">
      <Navbar balance={balance} currentPage="Games" />
      <div className="container flex flex-row gap-4 p-4 mx-auto mt-8 flex-wrap">
        <GamesCard
          name="European Roulette"
          img="/assets/img/roulette.png"
          price={10}
          mode="Single Player or Multiplayer"
          url_single="/roulette"
          url_multi="/roulette-multiplayer"
        />
        <GamesCard
          name="Duck race"
          img="/assets/img/duck-race.png"
          price={2000}
          mode="Multiplayer"
          url_single="/"
          url_multi="/duck-race"
        />
        <GamesCard
          name="Soon Available Game"
          img=""
          price={0}
          mode="/"
          url_single="/"
          url_multi="/"
        />
        <GamesCard
          name="Soon Available Game"
          img=""
          price={0}
          mode="/"
          url_single="/"
          url_multi="/"
        />
      </div>
    </div>
  );
}
