import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const COLORS = {
  bg: "#0F1117",
  surface: "#1A1D27",
  border: "#2A2E45",
  accent: "#6C63FF",
  accentLight: "#8B85FF",
  accentDim: "#6C63FF22",
  success: "#22D3A5",
  successDim: "#22D3A522",
  danger: "#FF5C6A",
  textPrimary: "#EEEEF5",
  textSecondary: "#8B8FA8",
  textMuted: "#4A4E6A",
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nombreFocused, setNombreFocused] = useState(false);

  const generarCodigoBot = (nombreNegocio: string) => {
    const base = nombreNegocio
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${base}-${random}`;
  };

  const handleRegister = async () => {
    if (!email || !password || !nombre) {
      Alert.alert("Atención", "Completá todos los campos.");
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        "Atención",
        "La contraseña debe tener al menos 6 caracteres.",
      );
      return;
    }

    setCargando(true);
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setCargando(false);
      Alert.alert("Error", error.message);
      return;
    }

    if (data.user) {
      // 1. Iniciar sesión PRIMERO para asegurar que el usuario tenga permiso de RLS para insertar su propio perfil
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setCargando(false);
        Alert.alert("Cuenta creada", "Tu cuenta se creó pero no pudimos iniciar sesión automáticamente. Por favor ingresá manualmente.");
        router.replace("/login");
        return;
      }

      // 2. Crear o actualizar el perfil (usamos upsert por si ya existe una fila creada por un trigger)
      const codigoBot = generarCodigoBot(nombre);
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        nombre: nombre.trim(),
        codigo_bot: codigoBot,
        duracion_turno: 30,
        hora_apertura: "09:00:00",
        hora_cierre: "18:00:00",
        dias_trabajo: [1, 2, 3, 4, 5],
      }, { onConflict: 'id' });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        Alert.alert("Error de Base de Datos", `No pudimos guardar los datos de tu negocio: ${profileError.message}. Por favor, intentá de nuevo.`);
        setCargando(false);
        return;
      }

      // 3. Avisar al backend para generar horarios de inmediato
      try {
        fetch("https://app-turnos-4qaf.onrender.com/regenerar-horarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: data.user.id }),
        }).catch(err => console.error("Error triggering schedules:", err));
      } catch (e) { }

      setCargando(false);
      router.replace("/dashboard");
    } else {
      setCargando(false);
      Alert.alert("Error", "No se pudo crear el usuario.");
    }
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
            Crear cuenta
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Registrá tu negocio para empezar
          </Text>
        </View>

        <View style={{ gap: 16, marginBottom: 28 }}>
          <View>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1.2,
                marginBottom: 8,
              }}
            >
              NOMBRE DEL NEGOCIO
            </Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Peluquería López"
              placeholderTextColor={COLORS.textMuted}
              onFocus={() => setNombreFocused(true)}
              onBlur={() => setNombreFocused(false)}
              style={{
                backgroundColor: COLORS.surface,
                borderWidth: 1.5,
                borderColor: nombreFocused ? COLORS.accent : COLORS.border,
                borderRadius: 14,
                padding: 16,
                color: COLORS.textPrimary,
                fontSize: 15,
              }}
            />
          </View>

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
                placeholder="Mínimo 6 caracteres"
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

        <TouchableOpacity
          onPress={handleRegister}
          disabled={cargando}
          style={{
            backgroundColor: COLORS.accent,
            padding: 18,
            borderRadius: 14,
            alignItems: "center",
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
              Crear cuenta
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={{ alignItems: "center", padding: 10 }}
        >
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            ¿Ya tenés cuenta?{" "}
            <Text style={{ color: COLORS.accentLight, fontWeight: "700" }}>
              Iniciar sesión
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
