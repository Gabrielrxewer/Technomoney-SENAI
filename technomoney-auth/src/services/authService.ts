interface User {
  id: string;
  email: string;
  password: string;
  username: string;
}

const users: User[] = [];

export const registerUser = async (
  email: string,
  password: string,
  username: string
): Promise<User> => {
  const id = (users.length + 1).toString();
  const newUser = { id, email, password, username };
  users.push(newUser);
  return newUser;
};

export const loginUser = async (email: string): Promise<User | null> => {
  return users.find((user) => user.email === email) || null;
};
