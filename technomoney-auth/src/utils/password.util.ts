import argon2 from "argon2";

export const hashPassword = (pwd: string) => {
  return argon2.hash(pwd, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
};

export const comparePassword = (pwd: string, hash: string) => {
  return argon2.verify(hash, pwd);
};
