import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { View, ActivityIndicator, Text } from "react-native";

export default function AppLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const checkSession = async () => {
      await supabase.auth.signOut(); // ← agregá esta línea temporalmente
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
      }
      setLoading(false);
    };
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F1117",
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 40 }}>✂️</Text>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={{ color: "#4A4E6A", fontSize: 13, letterSpacing: 1.5 }}>
          CARGANDO...
        </Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
