import csrf from "csurf";

const isProd = process.env.NODE_ENV === "production";

export const csrfProtection = csrf({
  cookie: { httpOnly: true, sameSite: "lax", secure: isProd },
});
