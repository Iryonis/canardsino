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

interface CMCQuoteData {
  price: number;
  percent_change_24h: number;
  percent_change_7d: number;
  market_cap: number;
  last_updated: string;
}

export interface CMCQuoteResponse {
  data: {
    [symbol: string]: {
      id: number;
      name: string;
      symbol: string;
      quote: {
        USD: CMCQuoteData;
      };
    };
  };
  status: {
    error_code: number;
    error_message: string | null;
  };
}

export const SUPPORTED_CRYPTOS = ['BTC', 'ETH', 'USDC', 'USDT', 'POL'] as const;
export type SupportedCrypto = typeof SUPPORTED_CRYPTOS[number];

// Token addresses on Polygon for deposits
export const POLYGON_TOKENS: Record<string, { address: string; decimals: number; name: string }> = {
  USDC: {
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    name: 'USD Coin',
  },
  USDT: {
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    name: 'Tether USD',
  },
  WETH: {
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    decimals: 18,
    name: 'Wrapped Ether',
  },
  POL: {
    address: 'native',
    decimals: 18,
    name: 'Polygon',
  },
};

export const DEPOSIT_TOKENS = ['USDC', 'USDT', 'WETH', 'POL'] as const;
export type DepositToken = typeof DEPOSIT_TOKENS[number];
