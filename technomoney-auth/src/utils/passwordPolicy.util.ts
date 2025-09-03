export const validatePassword = (pwd: string) => {
  const min = Number(process.env.PASSWORD_MIN_LENGTH || "12");
  if (!pwd || pwd.length < min) return false;
  const common = [
    "123456",
    "password",
    "qwerty",
    "111111",
    "123123",
    "abc123",
    "iloveyou",
    "admin",
    "welcome",
  ];
  if (common.includes(pwd.toLowerCase())) return false;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNum = /[0-9]/.test(pwd);
  const hasSym = /[^A-Za-z0-9]/.test(pwd);
  const classes = [hasLower, hasUpper, hasNum, hasSym].filter(Boolean).length;
  return classes >= 2;
};
