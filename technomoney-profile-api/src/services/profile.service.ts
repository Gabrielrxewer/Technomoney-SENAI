import { AppError } from "../utils/app-error";
import { Profile } from "../models/profile.model";
import {
  ProfileRepository,
  ProfileUpsertData,
} from "../repositories/profile.repository";

export interface ProfileInput {
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  phone_number?: string | null;
  profession?: string | null;
  biography?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface ProfileDto {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  phone_number: string | null;
  profession: string | null;
  biography: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

function toDto(profile: Profile): ProfileDto {
  const toDateString = (value: Date | null) =>
    value ? value.toISOString().split("T")[0] : null;
  return {
    id: profile.id,
    user_id: profile.user_id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    birth_date: toDateString(profile.birth_date),
    phone_number: profile.phone_number,
    profession: profile.profession,
    biography: profile.biography,
    address_line1: profile.address_line1,
    address_line2: profile.address_line2,
    city: profile.city,
    state: profile.state,
    postal_code: profile.postal_code,
    country: profile.country,
    created_at: profile.created_at.toISOString(),
    updated_at: profile.updated_at.toISOString(),
  };
}

const normalizeString = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export class ProfileService {
  constructor(private readonly repo = new ProfileRepository()) {}

  async getByUserId(userId: string): Promise<ProfileDto | null> {
    const profile = await this.repo.findByUserId(userId);
    return profile ? toDto(profile) : null;
  }

  async upsert(userId: string, payload: ProfileInput): Promise<ProfileDto> {
    if (!userId) {
      throw new AppError(400, "Usuário inválido");
    }

    const data: ProfileUpsertData = {};

    const normalizedBirth = normalizeString(payload.birth_date);
    if (payload.birth_date !== undefined) {
      if (normalizedBirth === null) {
        data.birth_date = null;
      } else if (normalizedBirth) {
        const parsed = new Date(normalizedBirth);
        if (Number.isNaN(parsed.getTime())) {
          throw new AppError(400, "Data de nascimento inválida");
        }
        data.birth_date = parsed;
      }
    }

    const mapFields: (keyof ProfileInput)[] = [
      "first_name",
      "last_name",
      "phone_number",
      "profession",
      "biography",
      "address_line1",
      "address_line2",
      "city",
      "state",
      "postal_code",
      "country",
    ];

    for (const field of mapFields) {
      if (field in payload) {
        (data as any)[field] = normalizeString(payload[field]);
      }
    }

    const profile = await this.repo.upsert(userId, data);
    return toDto(profile);
  }
}
