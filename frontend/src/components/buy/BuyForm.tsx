"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useSwitchChain } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useAuth } from "@/hooks/useAuth";

// USDC contract address on Polygon (mainnet)
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359") as `0x${string}`;
const HOT_WALLET_ADDRESS = (process.env.NEXT_PUBLIC_HOT_WALLET_ADDRESS || "0x2681E0C15de88E0957383dD322e4cF5d8DBD28Bb") as `0x${string}`;
const EXCHANGE_RATE = 1000;
const USDC_DECIMALS = 6;
const POLYGON_CHAIN_ID = 137;

// Debug log
if (typeof window !== "undefined") {
  console.log("BuyForm config:", { USDC_ADDRESS, HOT_WALLET_ADDRESS });
}

// ERC20 ABI for transfer
const ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function BuyForm() {
  const [usdcAmount, setUsdcAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { address, isConnected } = useAccount();
  const { getAccessToken } = useAuth();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isWrongNetwork = chainId !== POLYGON_CHAIN_ID;

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Write contract for transfer
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();

  // Log write errors
  useEffect(() => {
    if (writeError) {
      console.error("Write contract error:", writeError);
      setError(writeError.message || "Transaction failed");
    }
  }, [writeError]);

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const processDeposit = useCallback(async (hash: string) => {
    setIsProcessing(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setError("Please log in to deposit");
        return;
      }

      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          txHash: hash,
          walletAddress: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process deposit");
        return;
      }

      setSuccess(`Deposit successful! +${data.transaction.amount.toLocaleString()} CCC`);
      setUsdcAmount("");
      refetchBalance();
    } catch (err) {
      console.error("Error processing deposit:", err);
      setError("Failed to process deposit");
    } finally {
      setIsProcessing(false);
    }
  }, [address, getAccessToken, refetchBalance]);

  // Process deposit after transaction confirms
  useEffect(() => {
    if (isConfirmed && txHash && !isProcessing) {
      processDeposit(txHash);
    }
  }, [isConfirmed, txHash, isProcessing, processDeposit]);

  const calculateCCCAmount = (amount: string): number => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return 0;
    return num * EXCHANGE_RATE;
  };

  const handleDeposit = async () => {
    setError(null);
    setSuccess(null);

    const num = parseFloat(usdcAmount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (num < 0.01) {
      setError("Minimum amount is 0.01 USDC");
      return;
    }

    const balanceNum = usdcBalance ? parseFloat(formatUnits(usdcBalance, USDC_DECIMALS)) : 0;
    if (num > balanceNum) {
      setError("Insufficient USDC balance");
      return;
    }

    try {
      const amountInUnits = parseUnits(usdcAmount, USDC_DECIMALS);
      console.log("Creating USDC transfer:", {
        usdcAddress: USDC_ADDRESS,
        hotWallet: HOT_WALLET_ADDRESS,
        amount: amountInUnits.toString(),
        amountUSDC: usdcAmount,
      });
      writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [HOT_WALLET_ADDRESS, amountInUnits],
      });
    } catch (err) {
      console.error("Error creating transaction:", err);
      setError("Failed to create transaction");
    }
  };

  const isPending = isWritePending || isConfirming || isProcessing;
  const formattedBalance = usdcBalance ? formatUnits(usdcBalance, USDC_DECIMALS) : "0";
  const cccAmount = calculateCCCAmount(usdcAmount);

  if (!isConnected) {
    return (
      <div className="p-6 bg-blue-dark rounded-lg border border-blue text-center">
        <p className="text-blue-light">Connect your wallet to deposit USDC</p>
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="p-6 bg-blue-dark rounded-lg border border-blue text-center">
        <p className="text-blue-light mb-4">Please switch to Polygon network</p>
        <button
          onClick={() => switchChain({ chainId: POLYGON_CHAIN_ID })}
          className="px-6 py-3 bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Switch to Polygon
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-blue-dark rounded-lg border border-blue">
      <h3 className="text-xl font-bold text-blue-lightest mb-4">Deposit USDC</h3>

      <div className="mb-4">
        <label className="block text-sm text-blue-light mb-2">Amount (USDC)</label>
        <input
          type="number"
          value={usdcAmount}
          onChange={(e) => {
            setUsdcAmount(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          disabled={isPending}
          className="w-full px-4 py-3 bg-blue-darkest border border-blue rounded-lg text-white placeholder-blue focus:outline-none focus:border-blue-light disabled:opacity-50"
        />
        <p className="text-xs text-blue mt-1">
          Available: {parseFloat(formattedBalance).toFixed(2)} USDC
        </p>
      </div>

      <div className="mb-4 p-3 bg-blue-darkest rounded-lg">
        <p className="text-sm text-blue-light">You will receive:</p>
        <p className="text-xl font-bold text-blue-lightest">
          {cccAmount.toLocaleString()} CCC
        </p>
        <p className="text-xs text-blue mt-1">Rate: 1 USDC = {EXCHANGE_RATE} CCC</p>
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
        onClick={handleDeposit}
        disabled={isPending || !usdcAmount}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isWritePending
          ? "Confirm in wallet..."
          : isConfirming
          ? "Confirming..."
          : isProcessing
          ? "Processing deposit..."
          : "Deposit"}
      </button>

      {isPending && (
        <p className="text-sm text-blue-light text-center mt-3">
          {isWritePending && "Please confirm the transaction in your wallet..."}
          {isConfirming && "Waiting for blockchain confirmation..."}
          {isProcessing && "Crediting your account..."}
        </p>
      )}
    </div>
  );
}
