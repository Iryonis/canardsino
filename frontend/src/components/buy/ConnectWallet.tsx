"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";

export function ConnectWallet() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-dark rounded-lg border border-blue">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-blue-lightest text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => open({ view: "Account" })}
          className="px-4 py-2 text-sm text-blue-lightest hover:text-white transition-colors"
        >
          Manage Wallet
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="px-6 py-3 bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest font-semibold rounded-lg hover:opacity-90 transition-opacity"
    >
      Connect Wallet
    </button>
  );
}
