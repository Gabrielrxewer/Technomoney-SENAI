export interface AuthResponse {
  token: string;
  username: string | null;
}

export interface LoginVars {
  email: string;
  password: string;
  captchaToken: string;
}

export interface RegisterVars {
  username: string;
  email: string;
  password: string;
  captchaToken: string;
}
