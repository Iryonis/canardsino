import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { polygon } from "viem/chains";

// USDC contract address on Polygon
const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

// Hot wallet address (casino's deposit address)
const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ADDRESS || "";

// USDC has 6 decimals
const USDC_DECIMALS = 6;

// Exchange rate: 1 USDC = 1000 CCC
const EXCHANGE_RATE = 1000;

// ERC20 Transfer event ABI
const erc20Abi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

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
  amount: number; // USDC amount (human readable)
  cccAmount: number; // CCC amount to credit
  error?: string;
}

/**
 * Verify a USDC deposit transaction
 * @param txHash Transaction hash to verify
 * @returns Deposit verification result
 */
export async function verifyDeposit(
  txHash: `0x${string}`
): Promise<DepositVerification> {
  try {
    const client = getClient();

    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (!receipt) {
      return { valid: false, from: "", amount: 0, cccAmount: 0, error: "Transaction not found" };
    }

    if (receipt.status !== "success") {
      return { valid: false, from: "", amount: 0, cccAmount: 0, error: "Transaction failed" };
    }

    // Find USDC Transfer event to hot wallet
    const transferLog = receipt.logs.find((log) => {
      // Check if it's from USDC contract
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
        return false;
      }

      // Check if it's a Transfer event (topic[0] is the event signature)
      const transferEventSig =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      if (log.topics[0] !== transferEventSig) {
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
        amount: 0,
        cccAmount: 0,
        error: "No USDC transfer to hot wallet found in transaction",
      };
    }

    // Extract sender address from topic[1]
    const fromAddress = "0x" + transferLog.topics[1]?.slice(26);

    // Extract amount from data
    const amountRaw = BigInt(transferLog.data);
    const amountUsdc = parseFloat(formatUnits(amountRaw, USDC_DECIMALS));
    const cccAmount = amountUsdc * EXCHANGE_RATE;

    return {
      valid: true,
      from: fromAddress,
      amount: amountUsdc,
      cccAmount: cccAmount,
    };
  } catch (error) {
    console.error("Error verifying deposit:", error);
    return {
      valid: false,
      from: "",
      amount: 0,
      cccAmount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get hot wallet address for deposits
 */
export function getHotWalletAddress(): string {
  return HOT_WALLET_ADDRESS;
}

/**
 * Get USDC contract address
 */
export function getUsdcAddress(): string {
  return USDC_ADDRESS;
}

/**
 * Get exchange rate
 */
export function getExchangeRate(): number {
  return EXCHANGE_RATE;
}
