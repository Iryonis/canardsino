"use client";

import { useCryptoPrices } from "../../hooks/useCryptoPrices";

interface PriceItemProps {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

function PriceItem({ symbol, name, price, change24h }: PriceItemProps) {
  const isPositive = change24h >= 0;
  const changeColor = isPositive ? "text-green-400" : "text-red-400";
  const changeSign = isPositive ? "+" : "";

  const formatPrice = (p: number) => {
    if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    return `$${p.toFixed(4)}`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-dark/30 rounded-lg">
      <span className="font-semibold text-blue-lightest">{symbol}</span>
      <span className="text-blue-light text-sm">{formatPrice(price)}</span>
      <span className={`text-xs ${changeColor}`}>
        {changeSign}
        {change24h.toFixed(2)}%
      </span>
    </div>
  );
}

export function PriceTicker() {
  const { quotes, isLoading, error } = useCryptoPrices();

  if (isLoading && quotes.length === 0) {
    return (
      <div className="flex items-center gap-2 text-blue-light text-sm">
        <span className="animate-pulse">Loading prices...</span>
      </div>
    );
  }

  if (error && quotes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {quotes.map((quote) => (
        <PriceItem
          key={quote.symbol}
          symbol={quote.symbol}
          name={quote.name}
          price={quote.price}
          change24h={quote.percentChange24h}
        />
      ))}
    </div>
  );
}
