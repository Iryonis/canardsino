"use client";

import { useAuth } from "../../hooks/useAuth";

export const LoggedNav = ({ balance }: { balance: number }) => {
  const { logout, user } = useAuth();
  return (
    <div>
      <span className="text-blue-light mr-4">
        Welcome {user?.username}{" "}
        {balance > 0 && `: 💰 Balance: ${balance} coins`}
      </span>
      <button
        onClick={logout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-blue-lightest rounded-lg transition"
      >
        Logout
      </button>
    </div>
  );
};
