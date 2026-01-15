import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { polygon } from "@reown/appkit/networks";

// Get projectId from environment variable
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

if (!projectId) {
  console.warn("NEXT_PUBLIC_REOWN_PROJECT_ID is not defined");
}

// Configure networks - Polygon only
export const networks = [polygon];

// Create Wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: projectId || "",
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
