import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AuthContextType } from "../../types/auth";
import Login from "./Login";

const executeRecaptchaMock = jest.fn();
const authApiGetMock = jest.fn();
const authApiPostMock = jest.fn();
const useAuthMock = jest.fn<AuthContextType, []>();

jest.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: executeRecaptchaMock }),
}));

jest.mock("../../services/http", () => ({
  authApi: {
    get: authApiGetMock,
    post: authApiPostMock,
    defaults: { headers: { common: {} } },
  },
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

const createContextValue = (overrides?: Partial<AuthContextType>): AuthContextType => ({
  token: null,
  username: null,
  login: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  isAuthenticated: false,
  loading: false,
  fetchWithAuth: jest.fn(),
  connected: false,
  lastEvent: null,
  connectEvents: jest.fn().mockResolvedValue(undefined),
  webauthnRegister: jest.fn().mockResolvedValue(false),
  webauthnAuthenticate: jest.fn().mockResolvedValue(false),
  stepUpRequirement: null,
  setStepUpRequirement: jest.fn(),
  ...overrides,
});

describe("Login step-up handling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    executeRecaptchaMock.mockResolvedValue("captcha-token");
    authApiGetMock.mockResolvedValue({ data: { csrfToken: "csrf" } });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("uses the provided token when enrolling TOTP is required", async () => {
    const loginFn = jest.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createContextValue({ login: loginFn }));
    const error = {
      response: {
        data: {
          stepUp: "enroll_totp",
          token: "jwt-token",
          username: "Neo",
        },
      },
    };
    authApiPostMock.mockImplementation((url: string) => {
      if (url === "auth/login") return Promise.reject(error);
      return Promise.resolve({ data: {} });
    });

    render(<Login />);
    await act(async () => {
      jest.runAllTimers();
    });

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(loginFn).toHaveBeenCalledWith("jwt-token", "Neo");
    });

    expect(
      screen.getByText(/Habilitar autenticação em duas etapas/i)
    ).toBeInTheDocument();
  });

  it("uses the provided token when a TOTP challenge is required", async () => {
    const loginFn = jest.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createContextValue({ login: loginFn }));
    const error = {
      response: {
        data: {
          stepUp: "totp",
          token: "jwt-token",
          username: "Trinity",
        },
      },
    };
    authApiPostMock.mockImplementation((url: string) => {
      if (url === "auth/login") return Promise.reject(error);
      return Promise.resolve({ data: {} });
    });

    render(<Login />);
    await act(async () => {
      jest.runAllTimers();
    });

    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Senha/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(loginFn).toHaveBeenCalledWith("jwt-token", "Trinity");
    });

    expect(
      screen.getByText(/Confirme o código do autenticador/i)
    ).toBeInTheDocument();
  });
});
