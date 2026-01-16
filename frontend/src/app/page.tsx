"use client";

import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import { Navbar } from "../components/navbar/navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getWalletBalance } from "@/lib/gameApi";

export default function Home() {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
        <div className="text-blue-lightest text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-darkest">
      {/* Header/Navbar */}
      <Navbar balance={balance} currentPage="" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-blue-lightest mb-6">
            Welcome to CoinCoin Casino
          </h2>
          <p className="text-xl text-blue-light mb-8">
            The premier online casino with cryptocurrency support on Polygon
            network
          </p>

          {isAuthenticated && user ? (
            <div className="bg-blue-dark rounded-2xl p-8 border border-blue max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-blue-lightest mb-4">
                Your Account
              </h3>
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-blue-light">Username:</span>
                  <span className="text-blue-lightest font-medium">
                    {user.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-light">Email:</span>
                  <span className="text-blue-lightest font-medium">
                    {user.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-light">Member Since:</span>
                  <span className="text-blue-lightest font-medium">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-blue">
                <p className="text-blue-light text-sm mb-4">
                  Ready to play some games?
                </p>
                <Link
                  href="/games-page"
                  className="mt-4 block w-full py-3 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-blue-darkest font-bold rounded-lg transition text-center"
                >
                  Check the games
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-4 gap-6 mt-12">
                <div className="bg-blue-dark rounded-xl p-6 border border-blue">
                  <div className="text-4xl mb-3">🎲</div>
                  <h3 className="text-xl font-bold text-blue-lightest mb-2">
                    European Roulette
                  </h3>
                  <p className="text-blue-light">
                    Classic casino game with fair odds
                  </p>
                </div>
                <div className="bg-blue-dark rounded-xl p-6 border border-blue border-yellow-500/50">
                  <div className="text-4xl mb-3">🦆</div>
                  <h3 className="text-xl font-bold text-yellow-400 mb-2">
                    Duck Race
                  </h3>
                  <p className="text-blue-light">
                    Multiplayer racing - winner takes all!
                  </p>
                </div>
                <div className="bg-blue-dark rounded-xl p-6 border border-blue">
                  <div className="text-4xl mb-3">💰</div>
                  <h3 className="text-xl font-bold text-blue-lightest mb-2">
                    CCC Token
                  </h3>
                  <p className="text-blue-light">
                    1000 CCC = $1 USD fixed rate
                  </p>
                </div>
                <div className="bg-blue-dark rounded-xl p-6 border border-blue">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="text-xl font-bold text-blue-lightest mb-2">
                    Secure & Fair
                  </h3>
                  <p className="text-blue-light">
                    Blockchain verified transactions
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-blue-darkest font-bold text-lg rounded-lg shadow-xl transition"
                >
                  Get Started Now
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-blue-light text-sm border-t border-blue mt-16">
        <p>CoinCoin Casino - University Project</p>
        <p className="mt-2">
          Microservices Architecture with Polygon Integration
        </p>
      </footer>
    </div>
  );
}
