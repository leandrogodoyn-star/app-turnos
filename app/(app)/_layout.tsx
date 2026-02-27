import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AppLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
    } catch (err) {
      console.error("Session check error in layout:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F1117" }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
