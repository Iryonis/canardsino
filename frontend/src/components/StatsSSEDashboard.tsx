// frontend/src/components/StatsSSEDashboard.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { tokenManager } from '@/lib/tokenManager';
import { StatsOverview, StatsDetails, RecentGamesTable } from './stats';
import { PriceTicker } from './prices/PriceTicker';
import { PortfolioValue } from './prices/PortfolioValue';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';

export interface SSEStats {
  userId: string;
  totalGames: number;
  totalBets: number;
  totalWins: number;
  netResult: number;
  netResultUSD?: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
  favoriteGame: string;
  recentGames: any[];
  allGames: any[];
  lastUpdated: string;
}

interface StatsSSEDashboardProps {
  userId: string;
}

export default function StatsSSEDashboard({ userId }: StatsSSEDashboardProps) {
  const [stats, setStats] = useState<SSEStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = useMemo(() => tokenManager.getAccessToken(), []);
  const { convertToUSD } = useCryptoPrices();

  useEffect(() => {
    if (!token) {
      setError('Authentication required. Please login.');
      return;
    }

    console.log('🔌 Creating SSE connection for userId:', userId);

    const eventSource = new EventSource(
      `/api/stats/stream?token=${encodeURIComponent(token)}`
    );

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened');
      setError(null);
    };

    // Listen for initial stats
    eventSource.addEventListener('initial-stats', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setStats(data);
      } catch (err) {
        console.error('Error parsing initial-stats:', err);
      }
    });

    // Listen for game completed events
    eventSource.addEventListener('game-completed', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        // Update with the new stats from the event
        if (data.stats) {
          console.log('✅ Updating stats with:', data.stats);
          setStats(data.stats);
        } else {
          console.warn('⚠️ No stats in game-completed event');
        }
      } catch (err) {
        console.error('Error parsing game-completed:', err);
      }
    });

    // Listen for connection confirmation
    eventSource.addEventListener('connected', (event: any) => {
      console.log('📨 Received connected event:', event.data);
    });

    eventSource.onmessage = (event) => {
      // This handles events without a specific event name
      console.log('📨 SSE message received (default):', event);
      try {
        const data = JSON.parse(event.data);
        setStats(data);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
        setError('Error parsing data');
      }
    };

    eventSource.onerror = () => {
      console.error('❌ SSE connection error');
      setError('Connection lost. Reconnecting...');
      eventSource.close();
    };

    return () => {
      console.log('🔌 Closing SSE connection');
      eventSource.close();
    };
  }, [userId, token]);

  return (
    <div className="min-h-screen bg-blue-darkest">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Price Ticker */}
        <div className="mb-6 p-4 bg-blue-dark/30 backdrop-blur border border-blue/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-blue-light uppercase tracking-wider">Live Crypto Prices</h2>
          </div>
          <PriceTicker />
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-light to-blue-lightest mb-2">
            Statistics Dashboard
          </h1>
        </div>

        {!token ? (
          <div className="bg-red-900/20 border border-red-500 text-red-400 p-6 rounded-lg text-center">
            <p className="text-lg font-semibold mb-2">🔒 Authentication Required</p>
            <p className="mb-4">You need to be logged in to view statistics.</p>
            <a 
              href="/login" 
              className="inline-block px-6 py-2 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-white font-medium rounded-lg transition-all duration-300"
            >
              Go to Login
            </a>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-yellow-900/20 border border-yellow-500 text-yellow-400 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Stats Display */}
            {stats ? (
              <div className="space-y-6">
                {/* Portfolio Value */}
                <PortfolioValue balanceCCC={stats.netResult > 0 ? stats.netResult : 0} />

                {/* Overview */}
                <StatsOverview
                  totalGames={stats.totalGames}
                  winRate={stats.winRate}
                  netResult={stats.netResult}
                  netResultUSD={stats.netResultUSD ?? convertToUSD(stats.netResult)}
                  biggestWin={stats.biggestWin}
                  biggestWinUSD={convertToUSD(stats.biggestWin)}
                />

                {/* Detailed Stats */}
                <StatsDetails
                  totalBets={stats.totalBets}
                  totalBetsUSD={convertToUSD(stats.totalBets)}
                  totalWins={stats.totalWins}
                  totalWinsUSD={convertToUSD(stats.totalWins)}
                  biggestLoss={stats.biggestLoss}
                  biggestLossUSD={convertToUSD(Math.abs(stats.biggestLoss))}
                  favoriteGame={stats.favoriteGame}
                />

                {/* Recent Games */}
                <RecentGamesTable
                  games={stats.recentGames}
                  allGames={stats.allGames}
                  convertToUSD={convertToUSD}
                />

                {/* Last Updated */}
                <p className="text-blue-light text-sm text-right">
                  Last updated: {new Date(stats.lastUpdated).toLocaleTimeString('en-US')}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-light mx-auto mb-4"></div>
                  <p className="text-blue-light">Loading statistics...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}