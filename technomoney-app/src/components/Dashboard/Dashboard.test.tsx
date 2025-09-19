import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  setLogger,
} from "@tanstack/react-query";
import Dashboard from "./Dashboard";
import { fetchApiWithAuth, setAuthRefreshHandler } from "../../services/http";

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ token: "token" }),
}));

jest.mock("../../services/http", () => {
  const requestMock = jest.fn();
  let refreshHandler: (() => Promise<string | null>) | null = null;
  const fetchApiWithAuth = jest.fn(async (url: string, config?: any) => {
    try {
      return await requestMock(url, config);
    } catch (err: any) {
      if (err?.response?.status === 401 && refreshHandler) {
        const refreshed = await refreshHandler();
        if (!refreshed) throw err;
        return await requestMock(url, config);
      }
      throw err;
    }
  });
  (fetchApiWithAuth as any).__requestMock = requestMock;
  return {
    fetchApiWithAuth,
    setAuthRefreshHandler: jest.fn((handler) => {
      refreshHandler = handler;
    }),
    setAuthTokenGetter: jest.fn(),
    authApi: {
      post: jest.fn(),
      get: jest.fn(),
      request: jest.fn(),
      defaults: { headers: { common: {} } },
    },
  };
});

describe("Dashboard", () => {
  beforeAll(() => {
    setLogger({ log: () => {}, warn: () => {}, error: () => {} });
  });

  it("recovers the assets list after refreshing the token on a 401 response", async () => {
    const refreshMock = jest.fn().mockResolvedValue("new-token");
    setAuthRefreshHandler(refreshMock);

    const requestMock = (fetchApiWithAuth as any)
      .__requestMock as jest.Mock;
    requestMock.mockRejectedValueOnce({ response: { status: 401 } });
    requestMock.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          tag: "ABC",
          nome: "Acao ABC",
          preco: 10,
          variacao: 1,
          volume: 100,
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText("Total de Ações")).toBeInTheDocument();
    });

    expect(requestMock).toHaveBeenCalledTimes(2);

    queryClient.clear();
  });
});
