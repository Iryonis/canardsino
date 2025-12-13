'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register({ email, username, password });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-darkest flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Casino Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-light to-blue-lightest mb-2">
            🎰 CoinCoin Casino
          </h1>
          <p className="text-blue-light text-lg">Join the Fun!</p>
        </div>

        {/* Register Card */}
        <div className="bg-blue-dark rounded-2xl shadow-2xl p-8 border border-blue">
          <h2 className="text-2xl font-bold text-blue-lightest mb-6 text-center">Create Account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-blue-light text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-blue-dark border border-blue rounded-lg text-blue-lightest placeholder-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light focus:border-transparent transition"
                placeholder="your@email.com"
              />
            </div>

            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-blue-light text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="w-full px-4 py-3 bg-blue-dark border border-blue rounded-lg text-blue-lightest placeholder-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light focus:border-transparent transition"
                placeholder="Choose a username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-blue-light text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-blue-dark border border-blue rounded-lg text-blue-lightest placeholder-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light focus:border-transparent transition"
                placeholder="Min 8 characters"
              />
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-blue-light text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-blue-dark border border-blue rounded-lg text-blue-lightest placeholder-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light focus:border-transparent transition"
                placeholder="Re-enter password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-blue-darkest font-bold rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-blue-light text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-light hover:text-blue-lightest font-medium transition">
                Login here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-blue-light text-sm">
          <p>CCC Token Rate: 1000 CCC = $1 USD</p>
        </div>
      </div>
    </div>
  );
}
