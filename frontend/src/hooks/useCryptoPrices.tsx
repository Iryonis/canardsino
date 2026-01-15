"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { pricesApi, CryptoQuote } from "../lib/pricesApi";

const REFRESH_INTERVAL = 60000;

interface PricesState {
  quotes: CryptoQuote[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface PricesContextType extends PricesState {
  getPrice: (symbol: string) => number | null;
  getQuote: (symbol: string) => CryptoQuote | null;
  convertToUSD: (cccAmount: number) => number | null;
  refresh: () => Promise<void>;
}

const PricesContext = createContext<PricesContextType | undefined>(undefined);

export function CryptoPricesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PricesState>({
    quotes: [],
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchPrices = useCallback(async () => {
    try {
      const quotes = await pricesApi.getQuotes();
      setState({
        quotes,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch prices",
      }));
    }
  }, []);

  useEffect(() => {
    fetchPrices();

    const interval = setInterval(fetchPrices, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchPrices]);

  const getPrice = useCallback(
    (symbol: string): number | null => {
      const quote = state.quotes.find(
        (q) => q.symbol.toUpperCase() === symbol.toUpperCase()
      );
      if (!quote) return null;
      return quote.price;
    },
    [state.quotes]
  );

  const getQuote = useCallback(
    (symbol: string): CryptoQuote | null => {
      return (
        state.quotes.find(
          (q) => q.symbol.toUpperCase() === symbol.toUpperCase()
        ) ?? null
      );
    },
    [state.quotes]
  );

  const convertToUSD = useCallback(
    (cccAmount: number): number | null => {
      const usdcPrice = getPrice("USDC");
      if (usdcPrice === null) return null;

      const cccToUsdc = cccAmount / 1000;
      return cccToUsdc * usdcPrice;
    },
    [getPrice]
  );

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await fetchPrices();
  }, [fetchPrices]);

  return (
    <PricesContext.Provider
      value={{
        ...state,
        getPrice,
        getQuote,
        convertToUSD,
        refresh,
      }}
    >
      {children}
    </PricesContext.Provider>
  );
}

export function useCryptoPrices() {
  const context = useContext(PricesContext);
  if (context === undefined) {
    throw new Error(
      "useCryptoPrices must be used within a CryptoPricesProvider"
    );
  }
  return context;
}
