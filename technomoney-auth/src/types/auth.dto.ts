export interface AuthTokensDto {
  access: string;
  refresh: string;
  username: string | null;
}
