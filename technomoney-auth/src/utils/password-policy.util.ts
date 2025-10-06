export const isStrong = (s: string) => {
  if (typeof s !== "string") return false;
  if (s.length < 12) return false;
  const sets = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];
  let score = 0;
  for (const r of sets) if (r.test(s)) score++;
  return score >= 3;
};
