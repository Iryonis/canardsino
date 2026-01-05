// frontend/src/app/stats-sse/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import StatsSSEDashboard from '@/components/StatsSSEDashboard';
import { Navbar } from '@/components/navbar/navbar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getWalletBalance } from '@/lib/gameApi';

export default function StatsSsePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      getWalletBalance()
        .then((bal) => setBalance(bal))
        .catch((err) => console.error('Error fetching balance:', err));
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-darkest">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-light mx-auto mb-4"></div>
          <p className="text-blue-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      <Navbar balance={balance} currentPage="Statistics" />
      <StatsSSEDashboard userId={user.id} />
    </>
  );
}