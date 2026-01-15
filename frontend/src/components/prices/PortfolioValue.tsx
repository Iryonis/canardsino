// frontend/src/components/prices/PortfolioValue.tsx
"use client";

import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface PortfolioValueProps {
  balanceCCC: number;
}

interface CryptoValueProps {
  symbol: string;
  amount: number;
  icon: string;
}

function CryptoValue({ symbol, amount, icon }: CryptoValueProps) {
  const formatAmount = (value: number, sym: string) => {
    if (sym === "BTC") return value.toFixed(8);
    if (sym === "ETH" || sym === "POL") return value.toFixed(6);
    return value.toFixed(2);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-darkest/50 rounded-lg">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-lg font-semibold text-blue-lightest">
          {formatAmount(amount, symbol)} {symbol}
        </p>
        <p className="text-xs text-blue-light">equivalent value</p>
      </div>
    </div>
  );
}

export function PortfolioValue({ balanceCCC }: PortfolioValueProps) {
  const { quotes, convertToUSD, isLoading } = useCryptoPrices();

  if (isLoading || quotes.length === 0) {
    return (
      <div className="bg-blue-dark/30 backdrop-blur border border-blue/50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-light uppercase tracking-wider mb-4">
          Portfolio Value
        </h2>
        <div className="animate-pulse text-blue-light">Loading prices...</div>
      </div>
    );
  }

  const usdValue = convertToUSD(balanceCCC);

  if (usdValue === null || balanceCCC <= 0) {
    return (
      <div className="bg-blue-dark/30 backdrop-blur border border-blue/50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-light uppercase tracking-wider mb-4">
          Portfolio Value
        </h2>
        <p className="text-blue-light">No positive balance to display</p>
      </div>
    );
  }

  const cryptoEquivalents = [
    { symbol: "BTC", icon: "₿" },
    { symbol: "ETH", icon: "Ξ" },
    { symbol: "POL", icon: "⬡" },
  ]
    .map(({ symbol, icon }) => {
      const quote = quotes.find((q) => q.symbol === symbol);
      if (!quote || quote.price === 0) return null;
      const amount = usdValue / quote.price;
      return { symbol, amount, icon };
    })
    .filter(Boolean) as CryptoValueProps[];

  return (
    <div className="bg-blue-dark/30 backdrop-blur border border-blue/50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-blue-light uppercase tracking-wider">
          Portfolio Value
        </h2>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-lightest">
            {balanceCCC.toLocaleString("en-US")} CCC
          </p>
          <p className="text-sm text-blue-light">≈ ${usdValue.toFixed(2)} USD</p>
        </div>
      </div>

      <p className="text-xs text-blue-light mb-3">Equivalent in other cryptocurrencies:</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cryptoEquivalents.map((crypto) => (
          <CryptoValue key={crypto.symbol} {...crypto} />
        ))}
      </div>
    </div>
  );
}
