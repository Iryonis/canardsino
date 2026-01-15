import { Request, Response } from 'express';
import { priceCache } from '../cache';
import { SUPPORTED_CRYPTOS, POLYGON_TOKENS, DEPOSIT_TOKENS } from '../types';

// CCC exchange rate: 1000 CCC = 1 USD
const CCC_PER_USD = 1000;

export const getQuotes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const quotes = await priceCache.getQuotes();

    if (!quotes) {
      res.status(503).json({
        success: false,
        error: 'Price data not available yet',
        message: 'Please try again in a few seconds',
      });
      return;
    }

    res.json({
      success: true,
      data: quotes,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting quotes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol } = req.params;
    const upperSymbol = symbol.toUpperCase();

    if (!SUPPORTED_CRYPTOS.includes(upperSymbol as any)) {
      res.status(400).json({
        success: false,
        error: `Unsupported cryptocurrency: ${symbol}`,
        supported: SUPPORTED_CRYPTOS,
      });
      return;
    }

    const quote = await priceCache.getQuote(upperSymbol);

    if (!quote) {
      res.status(503).json({
        success: false,
        error: 'Price data not available yet',
        message: 'Please try again in a few seconds',
      });
      return;
    }

    res.json({
      success: true,
      data: quote,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting quote:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getSupportedCryptos = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: SUPPORTED_CRYPTOS,
    timestamp: new Date().toISOString(),
  });
};

export const getDepositTokens = async (_req: Request, res: Response): Promise<void> => {
  const tokens = DEPOSIT_TOKENS.map((symbol) => {
    const tokenInfo = POLYGON_TOKENS[symbol];
    return {
      symbol,
      address: tokenInfo?.address || 'unknown',
      decimals: tokenInfo?.decimals || 18,
      name: tokenInfo?.name || symbol,
    };
  });

  res.json({
    success: true,
    data: tokens,
    network: 'polygon',
    chainId: 137,
    timestamp: new Date().toISOString(),
  });
};

export const convertToCCC = async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, amount } = req.params;
    const upperSymbol = symbol.toUpperCase();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid amount',
      });
      return;
    }

    // Map WETH to ETH for price lookup
    const priceSymbol = upperSymbol === 'WETH' ? 'ETH' : upperSymbol;

    if (!SUPPORTED_CRYPTOS.includes(priceSymbol as any)) {
      res.status(400).json({
        success: false,
        error: `Unsupported cryptocurrency: ${symbol}`,
        supported: SUPPORTED_CRYPTOS,
      });
      return;
    }

    const quote = await priceCache.getQuote(priceSymbol);

    if (!quote) {
      res.status(503).json({
        success: false,
        error: 'Price data not available yet',
      });
      return;
    }

    // Convert crypto to USD value, then to CCC
    const usdValue = numAmount * quote.price;
    const cccAmount = Math.floor(usdValue * CCC_PER_USD);

    res.json({
      success: true,
      data: {
        inputSymbol: upperSymbol,
        inputAmount: numAmount,
        priceUSD: quote.price,
        usdValue,
        cccAmount,
        rate: quote.price * CCC_PER_USD,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error converting to CCC:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const isStale = await priceCache.isStale();

  res.json({
    status: isStale ? 'degraded' : 'healthy',
    cacheStatus: isStale ? 'stale' : 'fresh',
    timestamp: new Date().toISOString(),
  });
};
