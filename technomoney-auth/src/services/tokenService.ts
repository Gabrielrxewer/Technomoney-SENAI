const refreshTokens: Set<string> = new Set();

export const addRefreshToken = (token: string) => {
  refreshTokens.add(token);
};

export const removeRefreshToken = (token: string) => {
  refreshTokens.delete(token);
};

export const isRefreshTokenValid = (token: string): boolean => {
  return refreshTokens.has(token);
};
