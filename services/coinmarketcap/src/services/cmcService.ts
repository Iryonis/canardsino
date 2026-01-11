import axios from 'axios';
import { CryptoQuote, CMCQuoteResponse, SUPPORTED_CRYPTOS } from '../types';

const CMC_API_KEY = process.env.CMC_API_KEY || '';
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

class CMCService {
  private apiKey: string;

  constructor() {
    this.apiKey = CMC_API_KEY;
    if (!this.apiKey) {
      console.warn('CMC_API_KEY not set - using mock data');
    }
  }

  async fetchQuotes(): Promise<CryptoQuote[]> {
    if (!this.apiKey) {
      return this.getMockQuotes();
    }

    try {
      const symbols = SUPPORTED_CRYPTOS.join(',');
      const response = await axios.get<CMCQuoteResponse>(
        `${CMC_BASE_URL}/cryptocurrency/quotes/latest`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': this.apiKey,
            'Accept': 'application/json',
          },
          params: {
            symbol: symbols,
            convert: 'USD',
          },
        }
      );

      if (response.data.status.error_code !== 0) {
        throw new Error(response.data.status.error_message || 'CMC API error');
      }

      return this.transformResponse(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('CMC API error:', error.response?.data || error.message);

        if (error.response?.status === 429) {
          console.warn('Rate limited by CMC API');
        }
      } else {
        console.error('Failed to fetch quotes:', error);
      }

      throw error;
    }
  }

  private transformResponse(response: CMCQuoteResponse): CryptoQuote[] {
    const quotes: CryptoQuote[] = [];

    for (const symbol of SUPPORTED_CRYPTOS) {
      const data = response.data[symbol];
      if (data) {
        quotes.push({
          symbol: data.symbol,
          name: data.name,
          price: data.quote.USD.price,
          percentChange24h: data.quote.USD.percent_change_24h,
          percentChange7d: data.quote.USD.percent_change_7d,
          marketCap: data.quote.USD.market_cap,
          lastUpdated: data.quote.USD.last_updated,
        });
      }
    }

    return quotes;
  }

  private getMockQuotes(): CryptoQuote[] {
    const now = new Date().toISOString();
    return [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 43250.50,
        percentChange24h: 2.35,
        percentChange7d: -1.20,
        marketCap: 847000000000,
        lastUpdated: now,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 2280.75,
        percentChange24h: 1.80,
        percentChange7d: 3.45,
        marketCap: 274000000000,
        lastUpdated: now,
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        price: 1.0001,
        percentChange24h: 0.01,
        percentChange7d: 0.00,
        marketCap: 24000000000,
        lastUpdated: now,
      },
      {
        symbol: 'POL',
        name: 'Polygon',
        price: 0.89,
        percentChange24h: -0.50,
        percentChange7d: 5.20,
        marketCap: 8000000000,
        lastUpdated: now,
      },
    ];
  }
}

export const cmcService = new CMCService();
