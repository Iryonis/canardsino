// frontend/src/components/StatsSSEDashboard.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { tokenManager } from '@/lib/tokenManager';
import { StatsOverview, StatsDetails, RecentGamesTable } from './stats';

export interface SSEStats {
  userId: string;
  totalGames: number;
  totalBets: number;
  totalWins: number;
  netResult: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
  favoriteGame: string;
  recentGames: any[];
  lastUpdated: string;
}

interface StatsSSEDashboardProps {
  userId: string;
}

export default function StatsSSEDashboard({ userId }: StatsSSEDashboardProps) {
  const [stats, setStats] = useState<SSEStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = useMemo(() => tokenManager.getAccessToken(), []);

  useEffect(() => {
    if (!token) {
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
      console.log('📨 Received initial-stats:', event.data);
      try {
        const data = JSON.parse(event.data);
        setStats(data);
      } catch (err) {
        console.error('Error parsing initial-stats:', err);
      }
    });

    // Listen for game completed events
    eventSource.addEventListener('game-completed', (event: any) => {
      console.log('📨 Received game-completed:', event.data);
      try {
        const data = JSON.parse(event.data);
        console.log('📊 Parsed game-completed data:', data);
        console.log('📈 Stats from event:', data.stats);
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-light to-blue-lightest mb-2">
            Statistics Dashboard
          </h1>
        </div>

        {!token ? (
          <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded-lg">
            Token not found. Please login again.
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
                {/* Overview */}
                <StatsOverview
                  totalGames={stats.totalGames}
                  winRate={stats.winRate}
                  netResult={stats.netResult}
                  biggestWin={stats.biggestWin}
                />

                {/* Detailed Stats */}
                <StatsDetails
                  totalBets={stats.totalBets}
                  totalWins={stats.totalWins}
                  biggestLoss={stats.biggestLoss}
                  favoriteGame={stats.favoriteGame}
                />

                {/* Recent Games */}
                <RecentGamesTable games={stats.recentGames} />

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