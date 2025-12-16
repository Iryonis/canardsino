import { Request, Response } from 'express';

const RANDOM_ORG_API_KEY = process.env.RANDOM_ORG_API_KEY;

interface RandomOrgResponse {
  result: {
    random: {
      data: number[];
    };
  };
}

/**
 * Get a random roulette number from Random.org API
 * @param req 
 * @param res 
 * @returns a JSON response with the roulette number
 */
export async function fetchRouletteNumber(req: Request, res: Response) {
  try {
    const response = await fetch('https://api.random.org/json-rpc/4/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'generateIntegers',
        params: {
          apiKey: RANDOM_ORG_API_KEY,
          n: 1,
          min: 0,
          max: 36,
          replacement: true
        },
        id: Date.now()
      })
    });

    const data = await response.json() as RandomOrgResponse;
    const number = data.result.random.data[0];
    
    const result = {
      number,
      timestamp: Date.now(),
      source: 'random.org'
    };

    res.json(result);
  } catch (error) {
    console.error('Random.org API error:', error);
    
    const fallbackNumber = Math.floor(Math.random() * 37);
    res.json({
      number: fallbackNumber,
      timestamp: Date.now(),
      source: 'fallback'
    });
  }
}