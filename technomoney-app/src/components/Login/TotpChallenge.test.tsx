import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AuthContextType } from "../../types/auth";
import TotpChallenge from "./TotpChallenge";

const useAuthMock = jest.fn<AuthContextType, []>();

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("TotpChallenge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("verifies the challenge and reuses the provided token", async () => {
    const fetchWithAuth = jest.fn().mockResolvedValue({
      data: { token: "new-token", acr: "aal2" },
    });
    const login = jest.fn().mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const setStepUpRequirement = jest.fn();
    useAuthMock.mockReturnValue({
      token: "jwt-token",
      username: "Neo",
      login,
      logout: jest.fn(),
      isAuthenticated: false,
      loading: false,
      fetchWithAuth,
      connected: false,
      lastEvent: null,
      connectEvents: jest.fn(),
      webauthnRegister: jest.fn(),
      webauthnAuthenticate: jest.fn(),
      stepUpRequirement: null,
      setStepUpRequirement,
    });

    render(<TotpChallenge onSuccess={onSuccess} />);

    const input = screen.getByLabelText(/Código de 6 dígitos/i);
    fireEvent.change(input, { target: { value: "654321" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        "/totp/challenge/verify",
        expect.objectContaining({
          method: "POST",
          data: { code: "654321" },
        })
      );
    });

    expect(login).toHaveBeenCalledWith("new-token", "Neo");
    expect(setStepUpRequirement).toHaveBeenCalledWith(null);
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ token: "new-token", acr: "aal2" })
    );
  });
});
