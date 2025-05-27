import { RefreshToken } from "../models";

export const addRefreshToken = async (
  token: string,
  userId: string
): Promise<void> => {
  try {
    await RefreshToken.create({
      token: token.trim(),
      user_id: userId,
      revoked: false,
    });
  } catch (error) {
    console.error("Erro ao salvar refresh token:", error);
    throw error;
  }
};

export const removeRefreshToken = async (token: string): Promise<void> => {
  try {
    const tokenInDb = await RefreshToken.findOne({
      where: { token: token.trim() },
    });
    if (tokenInDb) {
      tokenInDb.revoked = true;
      await tokenInDb.save();
    } else {
      console.warn("Token não encontrado para revogação:", token);
    }
  } catch (error) {
    console.error("Erro ao revogar refresh token:", error);
    throw error;
  }
};

export const isRefreshTokenValid = async (token: string): Promise<boolean> => {
  try {
    const tokenInDb = await RefreshToken.findOne({
      where: { token: token.trim(), revoked: false },
    });
    const isValid = !!tokenInDb;
    return isValid;
  } catch (error) {
    console.error("Erro ao validar refresh token:", error);
    return false;
  }
};
