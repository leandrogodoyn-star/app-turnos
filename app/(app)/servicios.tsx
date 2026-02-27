import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

type Servicio = {
  id: string;
  nombre: string;
  precio: number | null;
  descripcion: string | null;
  activo: boolean;
};

const VACIO: Omit<Servicio, "id"> = {
  nombre: "",
  precio: null,
  descripcion: null,
  activo: true,
};

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth?.user?.id;
    if (!id) return;
    setUserId(id);

    const { data, error } = await supabase
      .from("servicios")
      .select("*")
      .eq("admin_id", id)
      .order("nombre", { ascending: true });

    console.log("servicios cargados:", data, "error:", error);

    setServicios(data || []);
    setCargando(false);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(VACIO);
    setModalVisible(true);
  };

  const abrirEditar = (s: Servicio) => {
    setEditando(s);
    setForm({
      nombre: s.nombre,
      precio: s.precio,
      descripcion: s.descripcion,
      activo: s.activo,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) {
      Alert.alert("Atención", "El nombre es obligatorio.");
      return;
    }
    setGuardando(true);

    const payload = {
      nombre: form.nombre.trim(),
      precio: form.precio,
      descripcion: form.descripcion?.trim() || null,
      activo: form.activo,
      admin_id: userId,
    };

    if (editando) {
      const { error } = await supabase
        .from("servicios")
        .update(payload)
        .eq("id", editando.id);
      if (!error) {
        setServicios((prev) =>
          prev.map((s) => (s.id === editando.id ? { ...s, ...payload } : s)),
        );
      }
    } else {
      const { data, error } = await supabase
        .from("servicios")
        .insert(payload)
        .select()
        .single();
      console.log("insert error:", error, "data:", data);
      if (!error && data) setServicios((prev) => [...prev, data]);
    }

    setGuardando(false);
    setModalVisible(false);
  };

  const eliminar = (s: Servicio) => {
    Alert.alert("Eliminar servicio", `¿Eliminás "${s.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await supabase.from("servicios").delete().eq("id", s.id);
          setServicios((prev) => prev.filter((x) => x.id !== s.id));
        },
      },
    ]);
  };

  const toggleActivo = async (s: Servicio) => {
    const nuevo = !s.activo;
    await supabase.from("servicios").update({ activo: nuevo }).eq("id", s.id);
    setServicios((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, activo: nuevo } : x)),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: COLORS.accent, fontSize: 16 }}>← Volver</Text>
        </TouchableOpacity>
        <Text
          style={{
            color: COLORS.textPrimary,
            fontSize: 20,
            fontWeight: "800",
            flex: 1,
          }}
        >
          Servicios
        </Text>
        <TouchableOpacity
          onPress={abrirNuevo}
          style={{
            backgroundColor: COLORS.accent,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>
            + Nuevo
          </Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {servicios.length === 0 ? (
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 40,
                alignItems: "center",
                borderWidth: 1,
                borderColor: COLORS.border,
                borderStyle: "dashed",
              }}
            >
              <Text style={{ fontSize: 36, marginBottom: 12 }}>✂️</Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Todavía no tenés servicios.{"\n"}Tocá "+ Nuevo" para agregar
                uno.
              </Text>
            </View>
          ) : (
            servicios.map((s) => (
              <View
                key={s.id}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    backgroundColor: s.activo
                      ? COLORS.success
                      : COLORS.textMuted,
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                  }}
                />
                <View style={{ padding: 16, paddingLeft: 20 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.textPrimary,
                        fontSize: 16,
                        fontWeight: "700",
                        flex: 1,
                      }}
                    >
                      {s.nombre}
                    </Text>
                    {s.precio != null ? (
                      <Text
                        style={{
                          color: COLORS.success,
                          fontSize: 15,
                          fontWeight: "800",
                        }}
                      >
                        ${s.precio.toLocaleString("es-AR")}
                      </Text>
                    ) : (
                      <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                        Sin precio
                      </Text>
                    )}
                  </View>
                  {s.descripcion ? (
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      {s.descripcion}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => toggleActivo(s)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: s.activo
                          ? COLORS.successDim
                          : COLORS.dangerDim,
                        borderWidth: 1,
                        borderColor: s.activo
                          ? COLORS.success + "44"
                          : COLORS.danger + "44",
                      }}
                    >
                      <Text
                        style={{
                          color: s.activo ? COLORS.success : COLORS.danger,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {s.activo ? "✓ Activo" : "✕ Inactivo"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => abrirEditar(s)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: COLORS.accentDim,
                        borderWidth: 1,
                        borderColor: COLORS.accent + "44",
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.accentLight,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        ✏️ Editar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => eliminar(s)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: COLORS.dangerDim,
                        borderWidth: 1,
                        borderColor: COLORS.danger + "44",
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.danger,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        🗑
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal nuevo/editar */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#00000088",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 28,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: 18,
                fontWeight: "800",
                marginBottom: 20,
              }}
            >
              {editando ? "Editar servicio" : "Nuevo servicio"}
            </Text>

            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              NOMBRE *
            </Text>
            <TextInput
              value={form.nombre}
              onChangeText={(v) => setForm((p) => ({ ...p, nombre: v }))}
              placeholder="Ej: Corte de cabello"
              placeholderTextColor={COLORS.textMuted}
              style={{
                backgroundColor: COLORS.bg,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 14,
                color: COLORS.textPrimary,
                fontSize: 15,
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              PRECIO (opcional)
            </Text>
            <TextInput
              value={form.precio != null ? String(form.precio) : ""}
              onChangeText={(v) =>
                setForm((p) => ({
                  ...p,
                  precio: v === "" ? null : parseFloat(v),
                }))
              }
              placeholder="Ej: 2500"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              style={{
                backgroundColor: COLORS.bg,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 14,
                color: COLORS.textPrimary,
                fontSize: 15,
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              DESCRIPCIÓN (opcional)
            </Text>
            <TextInput
              value={form.descripcion || ""}
              onChangeText={(v) =>
                setForm((p) => ({ ...p, descripcion: v || null }))
              }
              placeholder="Ej: Incluye lavado y secado"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
              style={{
                backgroundColor: COLORS.bg,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 14,
                color: COLORS.textPrimary,
                fontSize: 15,
                marginBottom: 24,
                textAlignVertical: "top",
              }}
            />

            <TouchableOpacity
              onPress={guardar}
              disabled={guardando}
              style={{
                backgroundColor: COLORS.accent,
                padding: 16,
                borderRadius: 14,
                alignItems: "center",
                marginBottom: 12,
                opacity: guardando ? 0.7 : 1,
              }}
            >
              {guardando ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  style={{ color: "white", fontWeight: "700", fontSize: 15 }}
                >
                  {editando ? "Guardar cambios" : "Crear servicio"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ padding: 12 }}
            >
              <Text
                style={{ color: COLORS.textSecondary, textAlign: "center" }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
