"use client";

import { useAuth } from "../../hooks/useAuth";
import { LoggedNav } from "./loggedNav";
import { UnloggedNav } from "./unloggedNav";
import Link from "next/link";

export function Navbar({
  balance,
  currentPage,
}: {
  balance: number;
  currentPage: string;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
        <div className="text-blue-lightest text-xl">Loading...</div>
      </div>
    );
  }
  return (
    <nav className="bg-blue-dark/50 backdrop-blur border-b border-blue">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-light to-blue-lightest"
          >
            🎰 CoinCoin Casino
          </Link>{" "}
          <span className="ml-4 text-lg text-blue-light">
            {" "}
            {currentPage !== "" ? `- ${currentPage}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <LoggedNav balance={balance} />
          ) : (
            <UnloggedNav />
          )}
        </div>
      </div>
    </nav>
  );
}
