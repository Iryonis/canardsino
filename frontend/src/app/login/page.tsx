"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import {
  ApiError,
  AuthError,
  ValidationError,
  NetworkError,
} from "../../lib/apiErrors";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password });
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        setError("Invalid email or password");
      } else if (err instanceof ValidationError) {
        setError("Please check your input");
      } else if (err instanceof NetworkError) {
        setError("Network error. Please check your connection");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
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
          <p className="text-blue-light text-lg">Welcome Back!</p>
        </div>

        {/* Login Card */}
        <div className="bg-blue-dark rounded-2xl shadow-2xl p-8 border border-blue">
          <h2 className="text-2xl font-bold text-blue-lightest mb-6 text-center">
            Login
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-blue-light text-sm font-medium mb-2"
              >
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

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-blue-light text-sm font-medium mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-blue-dark border border-blue rounded-lg text-blue-lightest placeholder-blue-light focus:outline-none focus:ring-2 focus:ring-blue-light focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue to-blue-light hover:from-blue-light hover:to-blue-lightest text-blue-darkest font-bold rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-blue-light text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-blue-light font-bold hover:underline hover:text-blue-lightest transition"
              >
                Register here
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
