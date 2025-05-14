interface User {
  id: string;
  email: string;
  password: string;
}

const users: User[] = [];

export const registerUser = async (
  email: string,
  password: string
): Promise<User> => {
  const id = (users.length + 1).toString();
  const newUser = { id, email, password };
  users.push(newUser);
  return newUser;
};

export const loginUser = async (email: string): Promise<User | null> => {
  return users.find((user) => user.email === email) || null;
};
