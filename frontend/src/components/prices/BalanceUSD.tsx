"use client";

import { useCryptoPrices } from "../../hooks/useCryptoPrices";

interface BalanceUSDProps {
  cccBalance: number;
  showCCC?: boolean;
  className?: string;
}

export function BalanceUSD({
  cccBalance,
  showCCC = true,
  className = "",
}: BalanceUSDProps) {
  const { convertToUSD, isLoading } = useCryptoPrices();

  const usdValue = convertToUSD(cccBalance);

  const formatCCC = (amount: number) => {
    return amount.toLocaleString("en-US");
  };

  const formatUSD = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {showCCC && (
        <span className="font-bold text-blue-lightest">
          {formatCCC(cccBalance)} CCC
        </span>
      )}
      {isLoading ? (
        <span className="text-xs text-blue-light/70 animate-pulse">
          Loading...
        </span>
      ) : usdValue !== null ? (
        <span className="text-xs text-blue-light/70">
          {formatUSD(usdValue)}
        </span>
      ) : null}
    </div>
  );
}
