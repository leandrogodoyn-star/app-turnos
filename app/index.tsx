import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";

export default function Index() {
  useEffect(() => {
    check();
  }, []);

  const check = async () => {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  };

  return null;
}
