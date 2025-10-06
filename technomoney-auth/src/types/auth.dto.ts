export interface AuthTokensDto {
  access: string;
  refresh: string;
  username: string | null;
}

export interface RefreshTokensDto {
  access: string;
  refresh: string;
}

export interface StepUpTokenDto {
  token: string;
  acr: string;
  scope: string[];
  username: string | null;
}

export interface LoginResult {
  id: string;
  username: string | null;
}
