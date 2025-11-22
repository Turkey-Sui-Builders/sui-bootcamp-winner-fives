import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.stubEnv("VITE_PACKAGE_ID", "0x1234567890abcdef");
vi.stubEnv("VITE_JOB_BOARD_ID", "0xabcdef1234567890");
vi.stubEnv("VITE_CLOCK_ID", "0x6");
vi.stubEnv("VITE_NETWORK", "testnet");
vi.stubEnv("VITE_ENOKI_API_KEY", "test-enoki-key");
vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-google-client-id");
