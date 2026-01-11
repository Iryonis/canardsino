const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number;
  percentChange7d: number;
  marketCap: number;
  lastUpdated: string;
}

export interface QuotesResponse {
  success: boolean;
  data: CryptoQuote[];
  cached: boolean;
  timestamp: string;
}

export interface SingleQuoteResponse {
  success: boolean;
  data: CryptoQuote;
  cached: boolean;
  timestamp: string;
}

export interface SupportedCryptosResponse {
  success: boolean;
  data: string[];
  timestamp: string;
}

export const pricesApi = {
  getQuotes: async (): Promise<CryptoQuote[]> => {
    const response = await fetch(`${API_URL}/api/prices/quotes`);

    if (!response.ok) {
      throw new Error("Failed to fetch crypto prices");
    }

    const data: QuotesResponse = await response.json();

    if (!data.success) {
      throw new Error("Price data not available");
    }

    return data.data;
  },

  getQuote: async (symbol: string): Promise<CryptoQuote> => {
    const response = await fetch(`${API_URL}/api/prices/${symbol}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${symbol} price`);
    }

    const data: SingleQuoteResponse = await response.json();

    if (!data.success) {
      throw new Error("Price data not available");
    }

    return data.data;
  },

  getSupportedCryptos: async (): Promise<string[]> => {
    const response = await fetch(`${API_URL}/api/prices/supported`);

    if (!response.ok) {
      throw new Error("Failed to fetch supported cryptos");
    }

    const data: SupportedCryptosResponse = await response.json();
    return data.data;
  },
};
