"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/navbar/navbar";

export default function GivePage() {
  const { isAuthenticated, isLoading, getAccessToken } = useAuth();
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getAccessToken();
      if (!token) {
        setError("Please log in to continue");
        return;
      }

      const response = await fetch("/api/wallet/give", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to give tokens");
        return;
      }

      setSuccess(
        `Successfully added ${data.amount.toLocaleString()} CCC! New balance: ${data.newBalance.toLocaleString()} CCC`
      );
      setAmount("");
    } catch (err) {
      console.error("Error giving tokens:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-darkest flex items-center justify-center">
        <div className="text-blue-lightest text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-blue-darkest">
      <Navbar balance={0} currentPage="Give Tokens" />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-lightest mb-2">
            Give Yourself Tokens
          </h1>
          <p className="text-blue-light">
            Add CCC tokens to your account for testing
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <form
            onSubmit={handleSubmit}
            className="p-6 bg-blue-dark rounded-lg border border-blue"
          >
            <div className="mb-4">
              <label
                htmlFor="amount"
                className="block text-sm text-blue-light mb-2"
              >
                Amount (CCC)
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                placeholder="Enter amount"
                min="1"
                step="1"
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-blue-darkest border border-blue rounded-lg text-white placeholder-blue focus:outline-none focus:border-blue-light disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-light to-blue-lightest text-blue-darkest font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing..." : "Give Tokens"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-dark/50 rounded-lg border border-blue">
            <p className="text-xs text-blue-light text-center">
              This page is for testing purposes only. Tokens given here have no real value.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
