import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { store } from "./store";
import { ThemeProvider } from "./providers/ThemeProvider";
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
                <ThemeProvider>
                  <BrowserRouter>
                    <div className="min-h-screen text-main relative overflow-hidden">
                      {/* Atmospheric layers */}
                      <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 opacity-70" />
                        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
                        <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-amber-400/10 blur-[120px]" />
                        <div className="absolute bottom-[-200px] left-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
                      </div>

                      <Header />

                      <main className="relative max-w-6xl mx-auto px-6 py-10 lg:py-14">
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
                </ThemeProvider>
              </AuthProvider>
            </EnokiFlowProvider>
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
