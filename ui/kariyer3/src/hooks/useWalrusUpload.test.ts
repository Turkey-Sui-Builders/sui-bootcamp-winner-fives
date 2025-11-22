import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWalrusUpload } from "./useWalrusUpload";

describe("useWalrusUpload", () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should upload file successfully with newlyCreated response", async () => {
    const mockFile = new File(["test content"], "resume.pdf", { type: "application/pdf" });

    const mockResponse = {
      newlyCreated: {
        blobObject: {
          blobId: "test-blob-id-123",
          size: 12345,
        },
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useWalrusUpload());

    let uploadResult;
    await waitFor(async () => {
      uploadResult = await result.current.uploadFile(mockFile);
    });

    expect(uploadResult).toEqual({
      blobId: "test-blob-id-123",
      mediaType: "application/pdf",
    });
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should upload file successfully with alreadyCertified response", async () => {
    const mockFile = new File(["test content"], "resume.pdf", { type: "application/pdf" });

    const mockResponse = {
      alreadyCertified: {
        blobId: "existing-blob-id-456",
        endEpoch: 100,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useWalrusUpload());

    let uploadResult;
    await waitFor(async () => {
      uploadResult = await result.current.uploadFile(mockFile);
    });

    expect(uploadResult).toEqual({
      blobId: "existing-blob-id-456",
      mediaType: "application/pdf",
    });
  });

  it("should handle upload error", async () => {
    const mockFile = new File(["test content"], "resume.pdf", { type: "application/pdf" });

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useWalrusUpload());

    let uploadResult;
    await waitFor(async () => {
      uploadResult = await result.current.uploadFile(mockFile);
    });

    expect(uploadResult).toBeNull();
    expect(result.current.error).toBe("Upload failed: Internal Server Error");
    expect(result.current.uploading).toBe(false);
  });

  it("should handle network error", async () => {
    const mockFile = new File(["test content"], "resume.pdf", { type: "application/pdf" });

    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useWalrusUpload());

    let uploadResult;
    await waitFor(async () => {
      uploadResult = await result.current.uploadFile(mockFile);
    });

    expect(uploadResult).toBeNull();
    expect(result.current.error).toBe("Network error");
    expect(result.current.uploading).toBe(false);
  });

  it("should handle missing blob ID in response", async () => {
    const mockFile = new File(["test content"], "resume.pdf", { type: "application/pdf" });

    const mockResponse = {
      // No blobId anywhere
      someOtherField: "value",
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useWalrusUpload());

    let uploadResult;
    await waitFor(async () => {
      uploadResult = await result.current.uploadFile(mockFile);
    });

    expect(uploadResult).toBeNull();
    expect(result.current.error).toBe("No blob ID returned from Walrus");
  });

  it("should set uploading state correctly", async () => {
    const mockFile = new File(["test content"], "resume.pdf", { type: "application/pdf" });

    let resolveUpload: any;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });

    (global.fetch as any).mockReturnValueOnce(uploadPromise);

    const { result } = renderHook(() => useWalrusUpload());

    // Start upload
    const uploadPromiseResult = result.current.uploadFile(mockFile);

    // Should be uploading
    await waitFor(() => {
      expect(result.current.uploading).toBe(true);
    });

    // Resolve upload
    resolveUpload({
      ok: true,
      json: async () => ({
        newlyCreated: {
          blobObject: {
            blobId: "test-blob-id",
          },
        },
      }),
    });

    await uploadPromiseResult;

    // Should no longer be uploading
    expect(result.current.uploading).toBe(false);
  });

  it("should use correct Walrus endpoint and parameters", async () => {
    const mockFile = new File(["test content"], "resume.pdf", { type: "application/pdf" });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        newlyCreated: {
          blobObject: { blobId: "test-id" },
        },
      }),
    });

    const { result } = renderHook(() => useWalrusUpload());

    await waitFor(async () => {
      await result.current.uploadFile(mockFile);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/store?epochs=4320"),
      expect.objectContaining({
        method: "PUT",
        body: mockFile,
        headers: {
          "Content-Type": "application/pdf",
        },
      })
    );
  });

  it("should handle file without content type", async () => {
    const mockFile = new File(["test content"], "unknown-file");

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        newlyCreated: {
          blobObject: { blobId: "test-id" },
        },
      }),
    });

    const { result } = renderHook(() => useWalrusUpload());

    await waitFor(async () => {
      await result.current.uploadFile(mockFile);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          "Content-Type": "application/octet-stream",
        },
      })
    );
  });
});
