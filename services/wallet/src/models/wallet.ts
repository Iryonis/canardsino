import mongoose, { Document, Schema } from "mongoose";

// Wallet balance for a user
export interface IWallet extends Document {
  userId: string;
  balance: number; // CCC balance (internal currency)
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = mongoose.model<IWallet>("Wallet", walletSchema);

// Supported deposit tokens
export const DEPOSIT_TOKENS = ["USDC", "USDT", "WETH", "POL"] as const;
export type DepositToken = (typeof DEPOSIT_TOKENS)[number];

// Transaction record for deposits/withdrawals
export interface ITransaction extends Document {
  userId: string;
  type: "deposit" | "withdrawal";
  amount: number; // CCC amount
  cryptoAmount: number; // Amount in original crypto (human readable)
  cryptoSymbol: DepositToken; // Which crypto was deposited
  priceUSD: number; // USD price at time of deposit
  txHash: string; // Polygon transaction hash
  status: "pending" | "confirmed" | "failed";
  walletAddress: string; // User's wallet address
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    cryptoAmount: {
      type: Number,
      required: true,
    },
    cryptoSymbol: {
      type: String,
      enum: DEPOSIT_TOKENS,
      required: true,
    },
    priceUSD: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
    },
    walletAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);
