"use client";

import { wagmiAdapter, projectId } from "@/config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { polygon } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

// Create query client for React Query
const queryClient = new QueryClient();

// App metadata for wallet display
const metadata = {
  name: "CoinCoin Casino",
  description: "Buy and sell CCC tokens",
  url: typeof window !== "undefined" ? window.location.origin : "https://coincoincasino.com",
  icons: ["/coin-icon.png"],
};

// Initialize AppKit modal
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [polygon],
    defaultNetwork: polygon,
    metadata,
    features: {
      analytics: true,
      email: false,
      socials: false,
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#5bc0be",
      "--w3m-border-radius-master": "2px",
    },
  });
}

interface Web3ProviderProps {
  children: ReactNode;
  cookies: string | null;
}

export default function Web3Provider({ children, cookies }: Web3ProviderProps) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
