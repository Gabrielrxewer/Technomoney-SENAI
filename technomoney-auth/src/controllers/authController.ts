import { Request, Response } from "express";
import { generateToken } from "../utils/generateToken";
import bcrypt from "bcryptjs";
import { registerUser, loginUser } from "../services/authService";

export const register = async (req: any, res: any): Promise<any> => {
  const { email, password, username } = req.body;

  try {
    const existingUser = await loginUser(email);
    if (existingUser) {
      return res.status(400).json({ message: "E-mail já está em uso" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await registerUser(email, hashedPassword, username);

    const token = generateToken(newUser.id);

    return res.status(201).json({ token, username });
  } catch (error) {
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};

export const login = async (req: any, res: any): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await loginUser(email);
    if (!user) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Senha inválida" });
    }
    const token = generateToken(user.id);
    const username = user.username;
    return res.status(200).json({ token, username });
  } catch (error) {
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};
