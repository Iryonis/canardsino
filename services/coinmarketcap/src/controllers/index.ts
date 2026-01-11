import { Request, Response } from 'express';
import { priceCache } from '../cache';
import { SUPPORTED_CRYPTOS } from '../types';

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

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  const isStale = await priceCache.isStale();

  res.json({
    status: isStale ? 'degraded' : 'healthy',
    cacheStatus: isStale ? 'stale' : 'fresh',
    timestamp: new Date().toISOString(),
  });
};
