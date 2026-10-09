import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && publishableKey);
export const supabase = createClient(
  url || "https://configuration-required.supabase.co",
  publishableKey || "configuration-required",
);

export type StudentProfileRow = {
  user_id: string;
  name: string;
  handle: string;
  phone: string;
  location: string;
  university: string;
  bio: string;
  skills: string[];
};

export type GigRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  deadline: string | null;
  campus: string;
  tags: string[];
  work_types: string[];
  status: string;
  created_at: string;
  poster: { name: string; handle: string } | null;
  application_count?: { count: number }[];
};
