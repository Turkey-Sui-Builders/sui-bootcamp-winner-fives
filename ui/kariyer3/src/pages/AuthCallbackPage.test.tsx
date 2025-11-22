import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthCallbackPage } from "./AuthCallbackPage";
import { BrowserRouter } from "react-router-dom";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useAuthCallback
const mockAuthCallback = { handled: false };
vi.mock("@mysten/enoki/react", () => ({
  useAuthCallback: () => mockAuthCallback,
}));

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthCallback.handled = false;
    // Clear URL params
    window.history.replaceState({}, "", "/auth");
  });

  const renderAuthCallbackPage = () => {
    return render(
      <BrowserRouter>
        <AuthCallbackPage />
      </BrowserRouter>
    );
  };

  it("should render loading state initially", () => {
    renderAuthCallbackPage();

    expect(screen.getByText("Completing Sign In")).toBeInTheDocument();
    expect(screen.getByText("Processing your authentication...")).toBeInTheDocument();
  });

  it("should show loading indicator", () => {
    const { container } = renderAuthCallbackPage();

    // Check for loading dots
    const loadingDots = container.querySelectorAll(".animate-pulse");
    expect(loadingDots.length).toBeGreaterThan(0);
  });

  it("should navigate to home on successful authentication", async () => {
    renderAuthCallbackPage();

    // Simulate successful auth callback
    mockAuthCallback.handled = true;

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("should show error message on authentication failure", async () => {
    // Set error in URL params
    window.history.replaceState({}, "", "/auth?error=access_denied");

    renderAuthCallbackPage();

    // Simulate auth callback handled
    mockAuthCallback.handled = true;

    await waitFor(() => {
      expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
      expect(screen.getByText(/Authentication failed: access_denied/)).toBeInTheDocument();
    });
  });

  it("should redirect to home after showing error", async () => {
    window.history.replaceState({}, "", "/auth?error=invalid_request");

    renderAuthCallbackPage();

    mockAuthCallback.handled = true;

    await waitFor(() => {
      expect(screen.getByText("Redirecting to home page...")).toBeInTheDocument();
    });

    // Should navigate after timeout
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/");
      },
      { timeout: 3500 }
    );
  });

  it("should not navigate before callback is handled", () => {
    renderAuthCallbackPage();

    // Callback not handled yet
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should display different error messages", async () => {
    const errors = [
      { param: "access_denied", message: "Authentication failed: access_denied" },
      { param: "invalid_request", message: "Authentication failed: invalid_request" },
      { param: "server_error", message: "Authentication failed: server_error" },
    ];

    for (const { param, message } of errors) {
      vi.clearAllMocks();
      window.history.replaceState({}, "", `/auth?error=${param}`);

      const { unmount } = renderAuthCallbackPage();

      mockAuthCallback.handled = true;

      await waitFor(() => {
        expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
      });

      unmount();
    }
  });

  it("should handle successful auth without error param", async () => {
    window.history.replaceState({}, "", "/auth?code=test-auth-code");

    renderAuthCallbackPage();

    mockAuthCallback.handled = true;

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    // Should not show error message
    expect(screen.queryByText("Authentication Failed")).not.toBeInTheDocument();
  });
});
