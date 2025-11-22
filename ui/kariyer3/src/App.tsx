import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { store } from "./store";
import { AuthProvider } from "./providers/AuthProvider";
import { HomePage } from "./pages/HomePage";
import { JobDetailPage } from "./pages/JobDetailPage";
import { PostJobPage } from "./pages/PostJobPage";
import { MyJobsPage } from "./pages/MyJobsPage";
import { MyApplicationsPage } from "./pages/MyApplicationsPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { Header } from "./components/Header";
import { NETWORK, ENOKI_API_KEY } from "./config/constants";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();

const networkConfig = {
  [NETWORK]: {
    url: getFullnodeUrl(NETWORK),
  },
};

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork={NETWORK}>
          <WalletProvider autoConnect>
            <EnokiFlowProvider apiKey={ENOKI_API_KEY}>
              <AuthProvider>
                <BrowserRouter>
                  <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100">
                    <Header />
                    <main className="max-w-7xl mx-auto px-4 py-8">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/job/:id" element={<JobDetailPage />} />
                        <Route path="/post" element={<PostJobPage />} />
                        <Route path="/my-jobs" element={<MyJobsPage />} />
                        <Route path="/my-applications" element={<MyApplicationsPage />} />
                        <Route path="/auth" element={<AuthCallbackPage />} />
                      </Routes>
                    </main>
                  </div>
                </BrowserRouter>
              </AuthProvider>
            </EnokiFlowProvider>
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
