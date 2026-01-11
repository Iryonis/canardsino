export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  percentChange24h: number;
  percentChange7d: number;
  marketCap: number;
  lastUpdated: string;
}

export interface PriceEvent {
  type: 'price.updated';
  payload: {
    quotes: CryptoQuote[];
  };
  timestamp: string;
}

export interface CMCQuoteResponse {
  data: {
    [symbol: string]: {
      id: number;
      name: string;
      symbol: string;
      quote: {
        USD: {
          price: number;
          percent_change_24h: number;
          percent_change_7d: number;
          market_cap: number;
          last_updated: string;
        };
      };
    };
  };
  status: {
    error_code: number;
    error_message: string | null;
  };
}

export const SUPPORTED_CRYPTOS = ['BTC', 'ETH', 'USDC', 'POL'] as const;
export type SupportedCrypto = typeof SUPPORTED_CRYPTOS[number];
