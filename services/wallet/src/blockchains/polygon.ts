import { createPublicClient, http, formatUnits, formatEther } from "viem";
import { polygon } from "viem/chains";
import { DepositToken, DEPOSIT_TOKENS } from "../models/wallet.js";

// Hot wallet address (casino's deposit address)
const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ADDRESS || "";

// CCC exchange rate: 1000 CCC = 1 USD
const CCC_PER_USD = 1000;

// Token configurations on Polygon
const TOKEN_CONFIG: Record<
  DepositToken,
  { address: string; decimals: number; name: string }
> = {
  USDC: {
    address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    decimals: 6,
    name: "USD Coin",
  },
  USDT: {
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    name: "Tether USD",
  },
  WETH: {
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18,
    name: "Wrapped Ether",
  },
  POL: {
    address: "native",
    decimals: 18,
    name: "Polygon",
  },
};

// ERC20 Transfer event signature
const TRANSFER_EVENT_SIG =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Create Polygon client
const getClient = () => {
  const rpcUrl = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
  return createPublicClient({
    chain: polygon,
    transport: http(rpcUrl),
  });
};

export interface DepositVerification {
  valid: boolean;
  from: string;
  cryptoAmount: number; // Amount in original crypto (human readable)
  cryptoSymbol: DepositToken;
  error?: string;
}

/**
 * Verify a crypto deposit transaction
 * @param txHash Transaction hash to verify
 * @param cryptoSymbol Which crypto to look for (USDC, USDT, WETH, POL)
 * @returns Deposit verification result
 */
export async function verifyDeposit(
  txHash: `0x${string}`,
  cryptoSymbol: DepositToken
): Promise<DepositVerification> {
  try {
    if (!DEPOSIT_TOKENS.includes(cryptoSymbol)) {
      return {
        valid: false,
        from: "",
        cryptoAmount: 0,
        cryptoSymbol,
        error: `Unsupported token: ${cryptoSymbol}`,
      };
    }

    const client = getClient();
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (!receipt) {
      return {
        valid: false,
        from: "",
        cryptoAmount: 0,
        cryptoSymbol,
        error: "Transaction not found",
      };
    }

    if (receipt.status !== "success") {
      return {
        valid: false,
        from: "",
        cryptoAmount: 0,
        cryptoSymbol,
        error: "Transaction failed",
      };
    }

    // Handle native POL transfers
    if (cryptoSymbol === "POL") {
      return verifyNativeTransfer(receipt, txHash, client);
    }

    // Handle ERC20 token transfers
    return verifyERC20Transfer(receipt, cryptoSymbol);
  } catch (error) {
    console.error("Error verifying deposit:", error);
    return {
      valid: false,
      from: "",
      cryptoAmount: 0,
      cryptoSymbol,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify a native POL transfer
 */
async function verifyNativeTransfer(
  receipt: Awaited<ReturnType<ReturnType<typeof getClient>["getTransactionReceipt"]>>,
  txHash: `0x${string}`,
  client: ReturnType<typeof getClient>
): Promise<DepositVerification> {
  // Get the transaction to check value and recipient
  const tx = await client.getTransaction({ hash: txHash });

  if (!tx) {
    return {
      valid: false,
      from: "",
      cryptoAmount: 0,
      cryptoSymbol: "POL",
      error: "Transaction not found",
    };
  }

  // Check if recipient is hot wallet
  if (tx.to?.toLowerCase() !== HOT_WALLET_ADDRESS.toLowerCase()) {
    return {
      valid: false,
      from: "",
      cryptoAmount: 0,
      cryptoSymbol: "POL",
      error: "Transaction recipient is not the hot wallet",
    };
  }

  const polAmount = parseFloat(formatEther(tx.value));

  return {
    valid: true,
    from: tx.from,
    cryptoAmount: polAmount,
    cryptoSymbol: "POL",
  };
}

/**
 * Verify an ERC20 token transfer
 */
function verifyERC20Transfer(
  receipt: NonNullable<Awaited<ReturnType<ReturnType<typeof getClient>["getTransactionReceipt"]>>>,
  cryptoSymbol: DepositToken
): DepositVerification {
  const tokenConfig = TOKEN_CONFIG[cryptoSymbol];

  // Find the Transfer event for this token to hot wallet
  const transferLog = receipt.logs.find((log) => {
    // Check if it's from the correct token contract
    if (log.address.toLowerCase() !== tokenConfig.address.toLowerCase()) {
      return false;
    }

    // Check if it's a Transfer event
    if (log.topics[0] !== TRANSFER_EVENT_SIG) {
      return false;
    }

    // Check if recipient is hot wallet (topic[2] is the "to" address)
    const toAddress = "0x" + log.topics[2]?.slice(26);
    return toAddress.toLowerCase() === HOT_WALLET_ADDRESS.toLowerCase();
  });

  if (!transferLog) {
    return {
      valid: false,
      from: "",
      cryptoAmount: 0,
      cryptoSymbol,
      error: `No ${cryptoSymbol} transfer to hot wallet found in transaction`,
    };
  }

  // Extract sender address from topic[1]
  const fromAddress = "0x" + transferLog.topics[1]?.slice(26);

  // Extract amount from data
  const amountRaw = BigInt(transferLog.data);
  const cryptoAmount = parseFloat(formatUnits(amountRaw, tokenConfig.decimals));

  return {
    valid: true,
    from: fromAddress,
    cryptoAmount,
    cryptoSymbol,
  };
}

/**
 * Calculate CCC amount from crypto amount and USD price
 */
export function calculateCCCAmount(cryptoAmount: number, priceUSD: number): number {
  const usdValue = cryptoAmount * priceUSD;
  return Math.floor(usdValue * CCC_PER_USD);
}

/**
 * Get hot wallet address for deposits
 */
export function getHotWalletAddress(): string {
  return HOT_WALLET_ADDRESS;
}

/**
 * Get token configuration
 */
export function getTokenConfig(symbol: DepositToken) {
  return TOKEN_CONFIG[symbol];
}

/**
 * Get all supported deposit tokens
 */
export function getSupportedTokens() {
  return Object.entries(TOKEN_CONFIG).map(([symbol, config]) => ({
    symbol,
    ...config,
  }));
}

/**
 * Get CCC per USD rate
 */
export function getCCCPerUSD(): number {
  return CCC_PER_USD;
}
