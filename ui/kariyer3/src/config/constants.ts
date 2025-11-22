export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || "0x...";
export const JOB_BOARD_ID = import.meta.env.VITE_JOB_BOARD_ID || "0x...";
export const NETWORK = (import.meta.env.VITE_NETWORK || "testnet") as "mainnet" | "testnet" | "devnet";
export const CLOCK_ID = "0x6";

// Walrus configuration (testnet endpoints)
export const WALRUS_AGGREGATOR = import.meta.env.VITE_WALRUS_AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";
export const WALRUS_PUBLISHER = import.meta.env.VITE_WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space";

// Enoki configuration
export const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY || "";
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Job categories
export const JOB_CATEGORIES = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Product",
  "Operations",
  "Finance",
  "Legal",
  "HR",
  "Other",
] as const;

// Job status
export const JOB_STATUS = {
  OPEN: 0,
  CLOSED: 1,
  HIRED: 2,
} as const;
