"use client";

import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";

export const LoggedNav = ({ balance }: { balance: number }) => {
  const { logout, user } = useAuth();
  return (
    <div className="flex items-center gap-4">
      <span className="text-blue-light">
        Welcome {user?.username}{" "}
        {balance > 0 && `: 💰 Balance: ${balance} coins`}
      </span>
      <Link
        href="/games-page"
        className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-green-500 hover:from-green-500 hover:to-green-400 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-600/50"
      >
        Games
      </Link>
      <Link
        href="/stats-sse"
        className="px-4 py-2 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-blue-light/50"
      >
        My Stats
      </Link>
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
      >
        Logout
      </button>
    </div>
  );
};
