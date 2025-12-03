import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/Button";
import "./ProfilePage.css";
import { fetchProfile, getErrorMessage, saveProfile } from "../../services/profile";
import type { Profile, ProfileInput } from "../../types/profile";

interface FormState {
  first_name: string;
  last_name: string;
  birth_date: string;
  phone_number: string;
  profession: string;
  biography: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const emptyState: FormState = {
  first_name: "",
  last_name: "",
  birth_date: "",
  phone_number: "",
  profession: "",
  biography: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

function toFormState(profile: Profile | null | undefined): FormState {
  if (!profile) return { ...emptyState };
  return {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    birth_date: profile.birth_date ?? "",
    phone_number: profile.phone_number ?? "",
    profession: profile.profession ?? "",
    biography: profile.biography ?? "",
    address_line1: profile.address_line1 ?? "",
    address_line2: profile.address_line2 ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    postal_code: profile.postal_code ?? "",
    country: profile.country ?? "",
  };
}

function normalizePayload(state: FormState): ProfileInput {
  return Object.entries(state).reduce<ProfileInput>((acc, [key, value]) => {
    acc[key as keyof ProfileInput] = value.trim() === "" ? null : value;
    return acc;
  }, {});
}

const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: profile, isFetching } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
  const [formState, setFormState] = useState<FormState>(() => toFormState(profile));
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    setFormState(toFormState(profile));
  }, [profile]);

  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(["profile"], savedProfile);
      setStatus({ type: "success", message: "Perfil atualizado com sucesso!" });
    },
    onError: (error) => {
      setStatus({ type: "error", message: getErrorMessage(error) });
    },
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (status) setStatus(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(normalizePayload(formState));
  };

  const isSaving = mutation.isPending;
  const isLoading = isFetching && !profile;

  const lastUpdated = useMemo(() => {
    if (!profile?.updated_at) return null;
    try {
      const date = new Date(profile.updated_at);
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    } catch {
      return null;
    }
  }, [profile?.updated_at]);

  return (
    <main className="profile-page">
      <h1>Minha Conta</h1>
      <p className="description">
        Gerencie as informações do seu perfil. Todos os campos são opcionais —
        preencha apenas o que desejar compartilhar.
      </p>

      {isLoading ? (
        <div className="loading-state">
          <span className="loading-spinner" aria-hidden="true" />
          <span>Carregando dados do perfil…</span>
        </div>
      ) : (
        <form className="profile-form" onSubmit={handleSubmit}>
          <section className="profile-section">
            <h2>Informações pessoais</h2>
            <div className="profile-grid two-columns">
              <div className="profile-field">
                <label htmlFor="first_name">Nome</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  placeholder="Seu nome"
                  value={formState.first_name}
                  onChange={handleChange}
                  autoComplete="given-name"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="last_name">Sobrenome</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  placeholder="Seu sobrenome"
                  value={formState.last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="birth_date">Data de nascimento</label>
                <input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formState.birth_date}
                  onChange={handleChange}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="profile-field">
                <label htmlFor="phone_number">Telefone</label>
                <input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formState.phone_number}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section className="profile-section">
            <h2>Profissão e biografia</h2>
            <div className="profile-grid">
              <div className="profile-field">
                <label htmlFor="profession">Profissão</label>
                <input
                  id="profession"
                  name="profession"
                  type="text"
                  placeholder="Ex.: Analista financeiro"
                  value={formState.profession}
                  onChange={handleChange}
                  autoComplete="organization-title"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="biography">Sobre você</label>
                <textarea
                  id="biography"
                  name="biography"
                  placeholder="Conte um pouco sobre você, suas metas e interesses."
                  value={formState.biography}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>

          <section className="profile-section">
            <h2>Endereço</h2>
            <div className="profile-grid two-columns">
              <div className="profile-field">
                <label htmlFor="address_line1">Endereço</label>
                <input
                  id="address_line1"
                  name="address_line1"
                  type="text"
                  placeholder="Rua, número"
                  value={formState.address_line1}
                  onChange={handleChange}
                  autoComplete="address-line1"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="address_line2">Complemento</label>
                <input
                  id="address_line2"
                  name="address_line2"
                  type="text"
                  placeholder="Apartamento, bloco, referência"
                  value={formState.address_line2}
                  onChange={handleChange}
                  autoComplete="address-line2"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="city">Cidade</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Sua cidade"
                  value={formState.city}
                  onChange={handleChange}
                  autoComplete="address-level2"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="state">Estado</label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  placeholder="UF"
                  value={formState.state}
                  onChange={handleChange}
                  autoComplete="address-level1"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="postal_code">CEP</label>
                <input
                  id="postal_code"
                  name="postal_code"
                  type="text"
                  placeholder="00000-000"
                  value={formState.postal_code}
                  onChange={handleChange}
                  autoComplete="postal-code"
                />
              </div>
              <div className="profile-field">
                <label htmlFor="country">País</label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  placeholder="Brasil"
                  value={formState.country}
                  onChange={handleChange}
                  autoComplete="country-name"
                />
              </div>
            </div>
          </section>

          <div className="profile-actions">
            {status && (
              <span
                role="status"
                className={`profile-status ${status.type}`}
              >
                {status.message}
              </span>
            )}
            {lastUpdated && !isSaving && (
              <span className="profile-status" aria-live="polite">
                Última atualização: {lastUpdated}
              </span>
            )}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
};

export default ProfilePage;
