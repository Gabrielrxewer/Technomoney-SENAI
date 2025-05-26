import { Request, Response } from "express";

export const getDashboardData = (
  req: Request & { user?: any },
  res: Response
) => {
  const result = 1 + 1;

  res.json({
    message: `Olá ${req.user?.username}, o resultado de 1 + 1 é ${result}`,
    user: req.user,
    result,
  });
};
