import { User } from "../models";

interface UserInterface {
  id: string;
  email: string;
  password: string;
  username: string | null;
}

export const registerUser = async (
  email: string,
  password: string,
  username?: string
): Promise<UserInterface> => {
  const newUser = await User.create({
    email,
    password,
    username: username || null,
  });
  return newUser.toJSON() as UserInterface;
};

export const loginUser = async (
  email: string
): Promise<UserInterface | null> => {
  const user = await User.findOne({ where: { email } });
  if (!user) return null;
  return user.toJSON() as UserInterface;
};

export const getUserById = async (
  id: string
): Promise<UserInterface | null> => {
  const user = await User.findByPk(id);
  if (!user) return null;
  return user.toJSON() as UserInterface;
};

export const updateUser = async (
  id: string,
  fields: Partial<{ email: string; password: string; username: string }>
): Promise<UserInterface | null> => {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update(fields);
  return user.toJSON() as UserInterface;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const deletedCount = await User.destroy({ where: { id } });
  return deletedCount > 0;
};
