import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AuthContextType } from "../../types/auth";
import TotpEnrollment from "./TotpEnrollment";

const useAuthMock = jest.fn<AuthContextType, []>();

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

describe("TotpEnrollment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("walks through the enrollment flow using the existing session token", async () => {
    const fetchWithAuth = jest
      .fn()
      .mockResolvedValueOnce({ data: { enrolled: false } })
      .mockResolvedValueOnce({
        data: { qrDataUrl: "data:image/png;base64,QR", secret: "SECRET" },
      })
      .mockResolvedValueOnce({ data: {} });
    const onCompleted = jest.fn();
    useAuthMock.mockReturnValue({
      token: "jwt-token",
      username: "Neo",
      login: jest.fn(),
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
      setStepUpRequirement: jest.fn(),
    });

    render(<TotpEnrollment onCompleted={onCompleted} />);

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith("/api/auth/totp/status");
    });

    fireEvent.click(screen.getByRole("button", { name: /Gerar QR Code/i }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        "/api/auth/totp/setup/start",
        expect.objectContaining({ method: "POST" })
      );
    });

    const codeInput = await screen.findByLabelText(/Código de 6 dígitos/i);
    fireEvent.change(codeInput, { target: { value: "123456" } });

    await act(async () => {
      fireEvent.submit(codeInput.closest("form")!);
    });

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        "/api/auth/totp/setup/verify",
        expect.objectContaining({
          method: "POST",
          data: { code: "123456" },
        })
      );
    });

    expect(onCompleted).toHaveBeenCalled();
  });
});
