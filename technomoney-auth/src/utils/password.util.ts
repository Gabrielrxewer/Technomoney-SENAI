import bcrypt from "bcryptjs";

const PROD_ROUNDS = 13;
const DEV_ROUNDS  = 10;

const ROUNDS = process.env.NODE_ENV === "production" ? PROD_ROUNDS : DEV_ROUNDS;

export const hashPassword    = (plain: string)         => bcrypt.hash(plain, ROUNDS);
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
