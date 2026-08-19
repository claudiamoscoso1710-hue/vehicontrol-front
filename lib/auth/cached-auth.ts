import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { readCachedOrg } from "@/lib/auth/org-cookie";
import { readCachedRoleEntryFromCookies } from "@/lib/auth/role-cookie";

/** Una sola instancia de Supabase por request (deduplica layout + páginas). */
export const getAuthSupabase = cache(async () => createClient());

/** Usuario autenticado; getSession evita round-trip a Auth (~300 ms). RLS protege los datos. */
export const getAuthUser = cache(async () => {
  const supabase = await getAuthSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export type DriverProfile = {
  id: string;
  full_name: string;
  organization_id: string;
  commission_percent: number | null;
};

/** Contexto del conductor activo (deduplica auth + perfil por request). */
export const getDriverContext = cache(async () => {
  const supabase = await getAuthSupabase();
  const user = await getAuthUser();
  if (!user) return null;

  const { data: driver } = await supabase
    .from("drivers")
    .select("id, full_name, organization_id, commission_percent")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!driver) return null;

  return { supabase, user, driver: driver as DriverProfile };
});

/** Org activa del owner/admin/contador en el request actual. */
export const getOwnerContext = cache(async () => {
  const cookieStore = await cookies();
  const roleEntry = readCachedRoleEntryFromCookies(cookieStore);

  if (roleEntry) {
    const cachedOrg = readCachedOrg(cookieStore, roleEntry.userId);
    if (cachedOrg) {
      const supabase = await getAuthSupabase();
      return {
        supabase,
        user: { id: roleEntry.userId, email: undefined as string | undefined },
        org: cachedOrg,
      };
    }
  }

  const supabase = await getAuthSupabase();
  const user = await getAuthUser();
  if (!user) return null;

  const cachedOrg = readCachedOrg(cookieStore, user.id);
  if (cachedOrg) {
    return { supabase, user, org: cachedOrg };
  }

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  return { supabase, user, org };
});
