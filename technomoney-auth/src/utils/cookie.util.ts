export const buildRefreshCookie = () => {
  const isProd = process.env.NODE_ENV === "production";
  const secure =
    String(process.env.COOKIE_SECURE || "true").toLowerCase() === "true";
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: isProd ? secure : false,
    domain,
  };
};
