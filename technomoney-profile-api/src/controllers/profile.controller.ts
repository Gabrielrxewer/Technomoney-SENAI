import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { ProfileService } from "../services/profile.service";

const service = new ProfileService();

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const profile = await service.getByUserId(userId);
  res.json({ profile });
});

export const upsertMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const profile = await service.upsert(userId, req.body || {});
    res.status(200).json({ profile });
  }
);
