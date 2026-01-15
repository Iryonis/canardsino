"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/navbar/navbar";
import { ConnectWallet, TokenBalance, BuyForm, SellForm } from "@/components/buy";

export default function BuyPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
        <div className="text-blue-lightest text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-blue-darkest">
      <Navbar balance={0} currentPage="Buy CCC" />

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-lightest mb-2">
            Buy & Sell CCC Tokens
          </h1>
          <p className="text-blue-light">
            Exchange USDC for CCC tokens to play at CoinCoin Casino
          </p>
          <p className="text-sm text-blue mt-2">
            Rate: 1 USDC = 1000 CCC | Network: Polygon
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="flex justify-center mb-8">
          <ConnectWallet />
        </div>

        {/* Token Balances */}
        <div className="max-w-2xl mx-auto mb-8">
          <TokenBalance />
        </div>

        {/* Buy/Sell Forms */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <BuyForm />
          <SellForm />
        </div>

        {/* Info Section */}
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-blue-dark/50 rounded-lg border border-blue">
          <h3 className="text-lg font-semibold text-blue-lightest mb-3">
            How it works
          </h3>
          <ol className="space-y-2 text-sm text-blue-light">
            <li>1. Connect your wallet (MetaMask, WalletConnect, etc.)</li>
            <li>2. Make sure you have USDC on Polygon network</li>
            <li>3. Enter the amount and click Deposit</li>
            <li>4. Confirm the transaction in your wallet</li>
            <li>5. Your CCC balance will be credited automatically!</li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
            <p className="text-xs text-yellow-400">
              <strong>Note:</strong> This is running on Polygon Mainnet.
              Make sure you have POL for gas fees and USDC for deposits.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
