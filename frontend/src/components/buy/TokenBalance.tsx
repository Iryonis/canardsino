"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useAuth } from "@/hooks/useAuth";

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const USDC_DECIMALS = 6;

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function TokenBalance() {
  const [cccBalance, setCccBalance] = useState(0);
  const { address, isConnected } = useAccount();
  const { getAccessToken, isAuthenticated } = useAuth();

  // Read USDC balance from blockchain
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const fetchCCCBalance = useCallback(async () => {
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
      console.error("Error fetching CCC balance:", err);
    }
  }, [getAccessToken]);

  // Fetch CCC balance from wallet service
  useEffect(() => {
    if (isAuthenticated) {
      fetchCCCBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (!isConnected) {
    return null;
  }

  const formatBalance = (balance: number, decimals: number = 2): string => {
    if (isNaN(balance)) return "0";
    return balance.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formattedUsdc = usdcBalance
    ? parseFloat(formatUnits(usdcBalance, USDC_DECIMALS))
    : 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 bg-blue-dark rounded-lg border border-blue">
        <p className="text-sm text-blue-light mb-1">USDC Balance (Wallet)</p>
        <p className="text-2xl font-bold text-blue-lightest">
          ${formatBalance(formattedUsdc)}
        </p>
      </div>
      <div className="p-4 bg-blue-dark rounded-lg border border-blue">
        <p className="text-sm text-blue-light mb-1">CCC Balance (Casino)</p>
        <p className="text-2xl font-bold text-blue-lightest">
          {formatBalance(cccBalance, 0)} CCC
        </p>
      </div>
    </div>
  );
}
