// frontend/src/components/prices/CurrencySelector.tsx
"use client";

import { Currency } from "@/hooks/useCryptoPrices";

interface CurrencySelectorProps {
  selected: Currency;
  onChange: (currency: Currency) => void;
}

const currencies: { value: Currency; label: string; icon: string }[] = [
  { value: "USD", label: "USD", icon: "$" },
  { value: "BTC", label: "BTC", icon: "₿" },
  { value: "ETH", label: "ETH", icon: "Ξ" },
  { value: "POL", label: "POL", icon: "⬡" },
];

export function CurrencySelector({ selected, onChange }: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-blue-light uppercase tracking-wider">Convert to:</span>
      <div className="flex gap-1">
        {currencies.map((currency) => (
          <button
            key={currency.value}
            onClick={() => onChange(currency.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selected === currency.value
                ? "bg-gradient-to-r from-blue to-blue-light text-white"
                : "bg-blue-darkest/50 text-blue-light hover:bg-blue-dark/50"
            }`}
          >
            <span className="mr-1">{currency.icon}</span>
            {currency.label}
          </button>
        ))}
      </div>
    </div>
  );
}
