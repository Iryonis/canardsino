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
        href="/buy"
        className="px-4 py-2 bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest font-semibold rounded-lg hover:opacity-90 transition"
      >
        Buy CCC
      </Link>
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-blue-lightest rounded-lg transition"
      >
        Logout
      </button>
    </div>
  );
};
