"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/useAuth";

const EXCHANGE_RATE = 1000;

export function SellForm() {
  const [cccAmount, setCccAmount] = useState("");
  const [cccBalance, setCccBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isConnected } = useAccount();
  const { getAccessToken, isAuthenticated } = useAuth();

  // Fetch CCC balance from wallet service
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance();
    }
  }, [isAuthenticated]);

  const fetchBalance = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch("/api/wallet/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCccBalance(data.balance);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  const calculateUSDCAmount = (amount: string): number => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return 0;
    return num / EXCHANGE_RATE;
  };

  const handleWithdraw = async () => {
    setError(null);
    setSuccess(null);

    const num = parseFloat(cccAmount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (num > cccBalance) {
      setError("Insufficient CCC balance");
      return;
    }
    if (num < 10) {
      setError("Minimum withdrawal is 10 CCC");
      return;
    }

    setIsLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setError("Please log in");
        return;
      }

      // For now, withdrawals are not implemented (requires hot wallet to send tx)
      // This would require a backend endpoint that:
      // 1. Checks user's CCC balance
      // 2. Debits CCC from their account
      // 3. Sends USDC from hot wallet to user's address

      setError("Withdrawals are not yet available. Please contact support.");

      // Future implementation:
      // const response = await fetch("/api/wallet/withdraw", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify({ amount: num }),
      // });
    } catch (err) {
      console.error("Error requesting withdrawal:", err);
      setError("Failed to request withdrawal");
    } finally {
      setIsLoading(false);
    }
  };

  const usdcAmount = calculateUSDCAmount(cccAmount);

  if (!isConnected) {
    return (
      <div className="p-6 bg-blue-dark rounded-lg border border-blue text-center">
        <p className="text-blue-light">Connect your wallet to withdraw</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-blue-dark rounded-lg border border-blue">
      <h3 className="text-xl font-bold text-blue-lightest mb-4">Withdraw CCC</h3>

      <div className="mb-4">
        <label className="block text-sm text-blue-light mb-2">Amount (CCC)</label>
        <input
          type="number"
          value={cccAmount}
          onChange={(e) => {
            setCccAmount(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          placeholder="0"
          min="10"
          step="1"
          disabled={isLoading}
          className="w-full px-4 py-3 bg-blue-darkest border border-blue rounded-lg text-white placeholder-blue focus:outline-none focus:border-blue-light disabled:opacity-50"
        />
        <p className="text-xs text-blue mt-1">
          Available: {cccBalance.toLocaleString()} CCC
        </p>
      </div>

      <div className="mb-4 p-3 bg-blue-darkest rounded-lg">
        <p className="text-sm text-blue-light">You will receive:</p>
        <p className="text-xl font-bold text-blue-lightest">
          ${usdcAmount.toFixed(2)} USDC
        </p>
        <p className="text-xs text-blue mt-1">Rate: {EXCHANGE_RATE} CCC = 1 USDC</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg">
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      <button
        onClick={handleWithdraw}
        disabled={isLoading || !cccAmount}
        className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Processing..." : "Withdraw"}
      </button>

      <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
        <p className="text-xs text-yellow-400">
          Withdrawals are processed manually. Contact support for large withdrawals.
        </p>
      </div>
    </div>
  );
}
