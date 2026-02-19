import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

const COLORS = {
  bg: "#0F1117",
  surface: "#1A1D27",
  border: "#2A2E45",
  accent: "#6C63FF",
  accentLight: "#8B85FF",
  accentDim: "#6C63FF22",
  danger: "#FF5C6A",
  textPrimary: "#EEEEF5",
  textSecondary: "#8B8FA8",
  textMuted: "#4A4E6A",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Atención", "Completá todos los campos.");
      return;
    }

    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setCargando(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 28,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Título */}
        <View style={{ alignItems: "center", marginBottom: 48 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: COLORS.accentDim,
              borderWidth: 1.5,
              borderColor: COLORS.accent + "55",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 32 }}>✂️</Text>
          </View>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: -0.5,
              marginBottom: 8,
            }}
          >
            Bienvenido
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Ingresá a tu panel de turnos
          </Text>
        </View>

        {/* Formulario */}
        <View style={{ gap: 16, marginBottom: 28 }}>
          {/* Email */}
          <View>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1.2,
                marginBottom: 8,
              }}
            >
              EMAIL
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              style={{
                backgroundColor: COLORS.surface,
                borderWidth: 1.5,
                borderColor: emailFocused ? COLORS.accent : COLORS.border,
                borderRadius: 14,
                padding: 16,
                color: COLORS.textPrimary,
                fontSize: 15,
              }}
            />
          </View>

          {/* Password */}
          <View>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1.2,
                marginBottom: 8,
              }}
            >
              CONTRASEÑA
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!mostrarPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                style={{
                  backgroundColor: COLORS.surface,
                  borderWidth: 1.5,
                  borderColor: passwordFocused ? COLORS.accent : COLORS.border,
                  borderRadius: 14,
                  padding: 16,
                  paddingRight: 52,
                  color: COLORS.textPrimary,
                  fontSize: 15,
                }}
              />
              <TouchableOpacity
                onPress={() => setMostrarPassword(!mostrarPassword)}
                style={{
                  position: "absolute",
                  right: 16,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18 }}>
                  {mostrarPassword ? "🙈" : "👁️"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Botón login */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={cargando}
          style={{
            backgroundColor: COLORS.accent,
            padding: 18,
            borderRadius: 14,
            alignItems: "center",
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
            opacity: cargando ? 0.7 : 1,
            marginBottom: 20,
          }}
        >
          {cargando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "700",
                letterSpacing: 0.3,
              }}
            >
              Iniciar sesión
            </Text>
          )}
        </TouchableOpacity>

        {/* Ir a registro */}
        <TouchableOpacity
          onPress={() => router.push("/register")}
          style={{ alignItems: "center", padding: 10 }}
        >
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            ¿No tenés cuenta?{" "}
            <Text style={{ color: COLORS.accentLight, fontWeight: "700" }}>
              Registrate
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
