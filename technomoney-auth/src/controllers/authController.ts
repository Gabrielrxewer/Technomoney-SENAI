import { Request, Response } from "express";
import { generateToken } from "../utils/generateToken";
import bcrypt from "bcryptjs";
import { registerUser, loginUser } from "../services/authService";

export const register = async (req: any, res: any): Promise<any> => {
  const { email, password } = req.body;

  try {
    const existingUser = await loginUser(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log("REG PASSWORD", password);
    console.log("REG hashed.PASSWORD", hashedPassword);

    const newUser = await registerUser(email, hashedPassword);

    const token = generateToken(newUser.id);

    return res.status(201).json({ token });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: any, res: any): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user = await loginUser(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("PASSWORD", password),
    console.log("USER.PASSWORD", user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user.id);

    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
