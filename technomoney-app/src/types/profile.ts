export interface Profile {
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

export type ProfileInput = {
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
};

export interface ProfileResponse {
  profile: Profile | null;
}
