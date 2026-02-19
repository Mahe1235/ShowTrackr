import { createClient } from "@/lib/supabase/server";
import SettingsView from "./SettingsView";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <SettingsView userEmail={user?.email ?? null} />;
}
