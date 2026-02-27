import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

async function registrarPushToken() {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const { data: auth } = await supabase.auth.getUser();
  if (auth?.user?.id) {
    await supabase
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("id", auth.user.id);
  }
}

export default function AppLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
    registrarPushToken();
  }, []);

  const checkSession = async () => {
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
