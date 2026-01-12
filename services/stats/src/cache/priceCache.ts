export interface CryptoPrice {
  symbol: string;
  price: number;
  lastUpdated: string;
}

class PriceCache {
  private prices: Map<string, CryptoPrice> = new Map();

  setPrice(symbol: string, price: number): void {
    this.prices.set(symbol.toUpperCase(), {
      symbol: symbol.toUpperCase(),
      price,
      lastUpdated: new Date().toISOString(),
    });
  }

  setPrices(quotes: Array<{ symbol: string; price: number }>): void {
    for (const quote of quotes) {
      this.setPrice(quote.symbol, quote.price);
    }
    console.log(`Updated ${quotes.length} prices in cache`);
  }

  getPrice(symbol: string): number | null {
    const cached = this.prices.get(symbol.toUpperCase());
    return cached?.price ?? null;
  }

  getUsdcPrice(): number {
    return this.getPrice('USDC') ?? 1.0;
  }

  convertCCCtoUSD(cccAmount: number): number {
    const usdcPrice = this.getUsdcPrice();
    const cccToUsdc = cccAmount / 1000;
    return cccToUsdc * usdcPrice;
  }

  getAllPrices(): CryptoPrice[] {
    return Array.from(this.prices.values());
  }

  hasPrices(): boolean {
    return this.prices.size > 0;
  }
}

export const priceCache = new PriceCache();
