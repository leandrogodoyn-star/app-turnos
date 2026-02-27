import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function Index() {
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch (err) {
        router.replace("/login");
      }
    };
    check();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1117', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#6C63FF" />
      <Text style={{ color: 'white', marginTop: 10 }}>Iniciando...</Text>
    </View>
  );
}
