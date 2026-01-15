"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
  useSwitchChain,
  useSendTransaction,
} from "wagmi";
import { parseUnits, formatUnits, parseEther } from "viem";
import { useAuth } from "@/hooks/useAuth";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

const HOT_WALLET_ADDRESS = (process.env.NEXT_PUBLIC_HOT_WALLET_ADDRESS ||
  "0x2681E0C15de88E0957383dD322e4cF5d8DBD28Bb") as `0x${string}`;
const POLYGON_CHAIN_ID = 137;

// Token configurations
const DEPOSIT_TOKENS = {
  USDC: {
    address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`,
    decimals: 6,
    name: "USD Coin",
    priceSymbol: "USDC",
  },
  USDT: {
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as `0x${string}`,
    decimals: 6,
    name: "Tether USD",
    priceSymbol: "USDT",
  },
  WETH: {
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" as `0x${string}`,
    decimals: 18,
    name: "Wrapped Ether",
    priceSymbol: "ETH",
  },
  POL: {
    address: "native" as const,
    decimals: 18,
    name: "Polygon",
    priceSymbol: "POL",
  },
} as const;

type DepositTokenSymbol = keyof typeof DEPOSIT_TOKENS;

// ERC20 ABI for transfer and balanceOf
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
  const [selectedToken, setSelectedToken] =
    useState<DepositTokenSymbol>("USDC");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimatedCCC, setEstimatedCCC] = useState<number | null>(null);

  const { address, isConnected } = useAccount();
  const { getAccessToken } = useAuth();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { getPrice } = useCryptoPrices();
  const isWrongNetwork = chainId !== POLYGON_CHAIN_ID;

  const tokenConfig = DEPOSIT_TOKENS[selectedToken];
  const isNativeToken = tokenConfig.address === "native";

  // Read ERC20 token balance
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: isNativeToken ? undefined : tokenConfig.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isNativeToken },
  });

  // Write contract for ERC20 transfer
  const {
    writeContract,
    data: erc20TxHash,
    isPending: isERC20Pending,
    error: writeError,
  } = useWriteContract();

  // Send transaction for native POL transfer
  const {
    sendTransaction,
    data: nativeTxHash,
    isPending: isNativePending,
    error: sendError,
  } = useSendTransaction();

  const txHash = isNativeToken ? nativeTxHash : erc20TxHash;
  const isWritePending = isNativeToken ? isNativePending : isERC20Pending;
  const txError = isNativeToken ? sendError : writeError;

  // Log errors
  useEffect(() => {
    if (txError) {
      console.error("Transaction error:", txError);
      setError(txError.message || "Transaction failed");
    }
  }, [txError]);

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Update estimated CCC when amount or token changes
  useEffect(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setEstimatedCCC(null);
      return;
    }

    const price = getPrice(tokenConfig.priceSymbol);
    if (price === null) {
      setEstimatedCCC(null);
      return;
    }

    // 1000 CCC = 1 USD
    const usdValue = num * price;
    const ccc = Math.floor(usdValue * 1000);
    setEstimatedCCC(ccc);
  }, [amount, selectedToken, getPrice, tokenConfig.priceSymbol]);

  const processDeposit = useCallback(
    async (hash: string) => {
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
            cryptoSymbol: selectedToken,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to process deposit");
          return;
        }

        setSuccess(
          `Deposit successful! +${data.transaction.amount.toLocaleString()} CCC`
        );
        setAmount("");
        refetchBalance();
      } catch (err) {
        console.error("Error processing deposit:", err);
        setError("Failed to process deposit");
      } finally {
        setIsProcessing(false);
      }
    },
    [address, getAccessToken, refetchBalance, selectedToken]
  );

  // Process deposit after transaction confirms
  useEffect(() => {
    if (isConfirmed && txHash && !isProcessing) {
      processDeposit(txHash);
    }
  }, [isConfirmed, txHash, isProcessing, processDeposit]);

  const handleDeposit = async () => {
    setError(null);
    setSuccess(null);

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      if (isNativeToken) {
        // Native POL transfer
        const amountInWei = parseEther(amount);
        sendTransaction({
          to: HOT_WALLET_ADDRESS,
          value: amountInWei,
        });
      } else {
        // ERC20 token transfer
        const amountInUnits = parseUnits(amount, tokenConfig.decimals);
        writeContract({
          address: tokenConfig.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [HOT_WALLET_ADDRESS, amountInUnits],
        });
      }
    } catch (err) {
      console.error("Error creating transaction:", err);
      setError("Failed to create transaction");
    }
  };

  const isPending = isWritePending || isConfirming || isProcessing;
  const formattedBalance =
    tokenBalance && !isNativeToken
      ? formatUnits(tokenBalance, tokenConfig.decimals)
      : "0";
  const currentPrice = getPrice(tokenConfig.priceSymbol);

  if (!isConnected) {
    return (
      <div className="p-6 bg-blue-dark rounded-lg border border-blue text-center">
        <p className="text-blue-light">Connect your wallet to deposit crypto</p>
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
      <h3 className="text-xl font-bold text-blue-lightest mb-4">
        Deposit Crypto
      </h3>

      {/* Token selector */}
      <div className="mb-4">
        <label className="block text-sm text-blue-light mb-2">
          Select Token
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(DEPOSIT_TOKENS) as DepositTokenSymbol[]).map(
            (symbol) => (
              <button
                key={symbol}
                onClick={() => {
                  setSelectedToken(symbol);
                  setAmount("");
                  setError(null);
                  setSuccess(null);
                }}
                disabled={isPending}
                className={`px-3 py-2 rounded-lg font-medium transition-all ${
                  selectedToken === symbol
                    ? "bg-blue-light text-blue-darkest"
                    : "bg-blue-darkest text-blue-light border border-blue hover:border-blue-light"
                } disabled:opacity-50`}
              >
                {symbol}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-blue-light mb-2">
          Amount ({selectedToken})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          placeholder="0.00"
          min="0"
          step={
            selectedToken === "POL" || selectedToken === "WETH"
              ? "0.0001"
              : "0.01"
          }
          disabled={isPending}
          className="w-full px-4 py-3 bg-blue-darkest border border-blue rounded-lg text-white placeholder-blue focus:outline-none focus:border-blue-light disabled:opacity-50"
        />
        {!isNativeToken && (
          <p className="text-xs text-blue mt-1">
            Available:{" "}
            {parseFloat(formattedBalance).toFixed(
              tokenConfig.decimals === 6 ? 2 : 4
            )}{" "}
            {selectedToken}
          </p>
        )}
      </div>

      <div className="mb-4 p-3 bg-blue-darkest rounded-lg">
        <p className="text-sm text-blue-light">You will receive:</p>
        <p className="text-xl font-bold text-blue-lightest">
          {estimatedCCC !== null ? estimatedCCC.toLocaleString() : "---"} CCC
        </p>
        {currentPrice !== null && (
          <p className="text-xs text-blue mt-1">
            Rate: 1 {selectedToken} = $
            {currentPrice.toFixed(selectedToken === "POL" ? 4 : 2)} ={" "}
            {Math.floor(currentPrice * 1000).toLocaleString()} CCC
          </p>
        )}
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
        disabled={isPending || !amount || estimatedCCC === null}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isWritePending
          ? "Confirm in wallet..."
          : isConfirming
          ? "Confirming..."
          : isProcessing
          ? "Processing deposit..."
          : `Deposit ${selectedToken}`}
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
