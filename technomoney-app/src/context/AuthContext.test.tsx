import React, { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import type { AuthContextType } from "../types/auth";
import { AuthProvider, useAuth } from "./AuthContext";

const postMock = jest.fn();
const getMock = jest.fn();
const requestMock = jest.fn();
const setAuthTokenGetterMock = jest.fn();

jest.mock("../services/http", () => ({
  authApi: {
    post: postMock,
    get: getMock,
    request: requestMock,
    defaults: { headers: { common: {} } },
  },
  setAuthTokenGetter: setAuthTokenGetterMock,
}));

class MockWebSocket {
  public static instances: MockWebSocket[] = [];
  public onopen: ((ev?: any) => void) | null = null;
  public onclose: ((ev: any) => void) | null = null;
  public onmessage: ((ev: any) => void) | null = null;
  public close = jest.fn();
  public send = jest.fn();
  constructor(public url: string, public protocol?: string) {
    MockWebSocket.instances.push(this);
  }
}

(global as any).WebSocket = MockWebSocket as unknown as typeof WebSocket;

const Consumer: React.FC<{ onReady: (ctx: AuthContextType) => void }> = ({
  onReady,
}) => {
  const ctx = useAuth();
  useEffect(() => {
    if (!ctx.loading) onReady(ctx);
  }, [ctx, onReady]);
  return null;
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockImplementation((url: string) => {
      if (url === "/auth/refresh") {
        return Promise.reject({ response: { status: 401 } });
      }
      if (url === "/auth/ws-ticket") {
        return Promise.resolve({
          data: { ticket: "ticket", sid: "sid", wsUrl: "ws://localhost" },
        });
      }
      return Promise.resolve({ data: {} });
    });
    requestMock.mockResolvedValue({ data: {} });
  });

  it("stores the token provided during login and reuses it for authenticated calls", async () => {
    let latestContext: AuthContextType | null = null;
    const onReady = jest.fn((ctx: AuthContextType) => {
      latestContext = ctx;
    });

    render(
      <AuthProvider>
        <Consumer onReady={onReady} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
      expect(latestContext).not.toBeNull();
      expect(latestContext!.loading).toBe(false);
    });

    await act(async () => {
      await latestContext!.login("jwt-token", "Neo");
    });

    await waitFor(() => {
      expect(latestContext!.token).toBe("jwt-token");
    });

    const refreshCallsBefore = postMock.mock.calls.filter(
      ([url]) => url === "/auth/refresh"
    ).length;

    await act(async () => {
      await latestContext!.fetchWithAuth("/api/auth/totp/status");
    });

    const refreshCallsAfter = postMock.mock.calls.filter(
      ([url]) => url === "/auth/refresh"
    ).length;

    expect(refreshCallsAfter).toBe(refreshCallsBefore);
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/auth/totp/status",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-token",
        }),
      })
    );
  });
});
