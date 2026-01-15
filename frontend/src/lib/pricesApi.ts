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

export interface DepositToken {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
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

export interface DepositTokensResponse {
  success: boolean;
  data: DepositToken[];
  network: string;
  chainId: number;
  timestamp: string;
}

export interface ConvertToCCCResponse {
  success: boolean;
  data: {
    inputSymbol: string;
    inputAmount: number;
    priceUSD: number;
    usdValue: number;
    cccAmount: number;
    rate: number;
  };
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

  getDepositTokens: async (): Promise<DepositToken[]> => {
    const response = await fetch(`${API_URL}/api/prices/deposit-tokens`);

    if (!response.ok) {
      throw new Error("Failed to fetch deposit tokens");
    }

    const data: DepositTokensResponse = await response.json();
    return data.data;
  },

  convertToCCC: async (symbol: string, amount: number): Promise<ConvertToCCCResponse["data"]> => {
    const response = await fetch(`${API_URL}/api/prices/convert/${symbol}/${amount}`);

    if (!response.ok) {
      throw new Error("Failed to convert to CCC");
    }

    const data: ConvertToCCCResponse = await response.json();

    if (!data.success) {
      throw new Error("Conversion failed");
    }

    return data.data;
  },
};
