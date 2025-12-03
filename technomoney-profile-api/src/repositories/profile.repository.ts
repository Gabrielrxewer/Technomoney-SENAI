import {
  Profile,
  ProfileAttributes,
  ProfileCreationAttributes,
} from "../models/profile.model";

export type ProfileUpsertData = Partial<
  Pick<
    ProfileAttributes,
    | "first_name"
    | "last_name"
    | "birth_date"
    | "phone_number"
    | "profession"
    | "biography"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "postal_code"
    | "country"
  >
>;

export class ProfileRepository {
  async findByUserId(userId: string): Promise<Profile | null> {
    return Profile.findOne({ where: { user_id: userId } });
  }

  async create(userId: string, data: ProfileUpsertData): Promise<Profile> {
    return Profile.create({
      user_id: userId,
      ...data,
      updated_at: new Date(),
    } as ProfileCreationAttributes);
  }

  async update(
    profile: Profile,
    data: ProfileUpsertData
  ): Promise<Profile> {
    return profile.update({
      ...data,
      updated_at: new Date(),
    } as Partial<ProfileAttributes>);
  }

  async upsert(userId: string, data: ProfileUpsertData): Promise<Profile> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return this.update(existing, data);
    }
    return this.create(userId, data);
  }
}
