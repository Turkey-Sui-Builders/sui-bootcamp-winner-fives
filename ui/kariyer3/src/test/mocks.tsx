import { ReactNode } from "react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureStore } from "@reduxjs/toolkit";
import jobsReducer from "../store/slices/jobsSlice";
import applicationsReducer from "../store/slices/applicationsSlice";
import filtersReducer from "../store/slices/filtersSlice";

// Mock store factory
export function createMockStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      jobs: jobsReducer,
      applications: applicationsReducer,
      filters: filtersReducer,
    },
    preloadedState,
  });
}

// Test wrapper with all providers
export function TestProviders({ children, store }: { children: ReactNode; store?: any }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockStore = store || createMockStore();

  return (
    <Provider store={mockStore}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

// Mock Auth Context
export const mockAuthContext = {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  isConnected: true,
  isUsingZkLogin: false,
  logout: () => {},
};

// Mock Sui Client
export const mockSuiClient = {
  getObject: async (params: any) => ({
    data: {
      content: {
        fields: {
          id: { id: "0x123" },
          employer: "0xemployer123",
          title: "Senior Blockchain Developer",
          description: "Test job description",
          company: "Test Company",
          location: "Remote",
          category: "Engineering",
          salary_range: [100000, 150000],
          tags: ["Rust", "Blockchain"],
          created_at: "1640000000000",
          status: "0",
          hired_candidate: { vec: [] },
        },
      },
    },
  }),
  getOwnedObjects: async (params: any) => ({
    data: [
      {
        data: {
          type: "0x1::job_board::Job",
          content: {
            fields: {
              id: { id: "0x123" },
              employer: "0xemployer123",
              title: "Senior Blockchain Developer",
              description: "Test job description",
              company: "Test Company",
              location: "Remote",
              category: "Engineering",
              salary_range: [100000, 150000],
              tags: ["Rust", "Blockchain"],
              created_at: "1640000000000",
              status: "0",
              hired_candidate: { vec: [] },
            },
          },
        },
      },
    ],
  }),
};

// Mock Walrus Upload
export const mockWalrusUpload = {
  uploadFile: async (file: File) => ({
    blobId: "test-blob-id-123",
    mediaType: "application/pdf",
  }),
  uploading: false,
  error: null,
};

// Mock Sign and Execute Transaction
export const mockSignAndExecute = {
  mutate: (params: any, callbacks: any) => {
    // Simulate successful transaction
    setTimeout(() => {
      callbacks.onSuccess?.({ digest: "test-digest-123" });
    }, 0);
  },
};

// Mock Enoki Flow
export const mockEnokiFlow = {
  createAuthorizationURL: async (params: any) => "https://accounts.google.com/oauth/authorize",
  logout: () => {},
};

// Sample job data
export const mockJob = {
  id: "0x123",
  employer: "0xemployer123",
  title: "Senior Blockchain Developer",
  description: "We are looking for an experienced blockchain developer to join our team.",
  company: "Sui Labs",
  location: "Remote",
  category: "Engineering",
  salary_range: [100000, 150000] as [number, number],
  tags: ["Rust", "Blockchain", "Move"],
  created_at: 1640000000000,
  status: 0,
  hired_candidate: null,
};

// Sample application data
export const mockApplication = {
  id: "0xapp123",
  job_id: "0x123",
  applicant: "0xapplicant123",
  cover_message: "I am very interested in this position.",
  cv_blob_id: "blob-id-456",
  applied_at: 1640100000000,
  ai_score: 85,
  ai_analysis: "Strong candidate with relevant experience",
};
