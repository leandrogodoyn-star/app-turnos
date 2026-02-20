import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ocwxvrtmgzcjnysapvvr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3h2cnRtZ3pjam55c2FwdnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDMwNzcsImV4cCI6MjA4Njk3OTA3N30.l7MgVmM7EBEpnyfnnoYNZE56fW4_pUeRR6XU1IcLnFI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
