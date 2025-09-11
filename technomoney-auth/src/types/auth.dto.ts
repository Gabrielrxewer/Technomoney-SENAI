export interface AuthTokensDto {
  access: string;
  refresh: string;
  username: string | null;
}

export interface RefreshTokensDto {
  access: string;
  refresh: string;
}
