import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  TextInput,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";
import { cambiarFoto } from "../../lib/utilidades";

type Turno = {
  id: string;
  user_id: string;
  fecha: string;
  hora: string;
  estado: string;
  creado_en: string;
  nombre_cliente?: string;
  telefono?: string;
  servicio?: string;
};

const COLORS = {
  bg: "#0F1117",
  surface: "#1A1D27",
  surfaceAlt: "#21253A",
  border: "#2A2E45",
  accent: "#6C63FF",
  accentLight: "#8B85FF",
  accentDim: "#6C63FF22",
  danger: "#FF5C6A",
  dangerDim: "#FF5C6A22",
  success: "#22D3A5",
  successDim: "#22D3A522",
  warning: "#FFAA40",
  warningDim: "#FFAA4022",
  whatsapp: "#25D366",
  whatsappDim: "#25D36622",
  textPrimary: "#EEEEF5",
  textSecondary: "#8B8FA8",
  textMuted: "#4A4E6A",
};

const estadoConfig: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  pendiente: {
    color: COLORS.warning,
    bg: COLORS.warningDim,
    label: "Pendiente",
  },
  confirmado: {
    color: COLORS.success,
    bg: COLORS.successDim,
    label: "Confirmado",
  },
  cancelado: { color: COLORS.danger, bg: COLORS.dangerDim, label: "Cancelado" },
};

function Badge({ estado }: { estado: string }) {
  const config = estadoConfig[estado] || estadoConfig.pendiente;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: config.bg,
        borderWidth: 1,
        borderColor: config.color + "55",
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          color: config.color,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.8,
        }}
      >
        {config.label.toUpperCase()}
      </Text>
    </View>
  );
}

function Avatar({ nombre }: { nombre?: string }) {
  const inicial = nombre?.[0]?.toUpperCase() || "?";
  const colores = [
    "#6C63FF",
    "#22D3A5",
    "#FFAA40",
    "#FF5C6A",
    "#4ECDC4",
    "#FF6B9D",
  ];
  const color = colores[(nombre?.charCodeAt(0) || 0) % colores.length];
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: color + "22",
        borderWidth: 1.5,
        borderColor: color + "55",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color, fontSize: 18, fontWeight: "800" }}>{inicial}</Text>
    </View>
  );
}

function TurnoCard({
  item,
  onCancelar,
}: {
  item: Turno;
  onCancelar: (id: string) => void;
}) {
  const esCancelado = item.estado === "cancelado";
  const [expandido, setExpandido] = useState(false);

  const abrirWhatsApp = () => {
    if (!item.telefono) return;
    const numero = item.telefono.replace(/\D/g, "");
    const mensaje = `Hola ${item.nombre_cliente || ""}, te confirmamos tu turno para el ${item.fecha} a las ${item.hora}. ¡Te esperamos!`;
    Linking.openURL(
      `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`,
    );
  };

  const confirmarCancelacion = () => {
    Alert.alert(
      "Cancelar turno",
      `¿Cancelás el turno de ${item.nombre_cliente || "este cliente"} a las ${item.hora}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: () => onCancelar(item.id),
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={() => setExpandido(!expandido)}
      activeOpacity={0.85}
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
        opacity: esCancelado ? 0.6 : 1,
      }}
    >
      {/* Barra acento izquierda */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: esCancelado ? COLORS.danger : COLORS.accent,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
        }}
      />

      {/* Fila principal */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          paddingLeft: 20,
        }}
      >
        <Avatar nombre={item.nombre_cliente} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: 15,
              fontWeight: "700",
              marginBottom: 3,
            }}
          >
            {item.nombre_cliente || "Cliente sin nombre"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              🕐 {item.hora}
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>•</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              📅 {item.fecha}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Badge estado={item.estado} />
          <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
            {expandido ? "▲" : "▼"}
          </Text>
        </View>
      </View>

      {/* Detalle expandido */}
      {expandido && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            padding: 16,
            paddingLeft: 20,
            gap: 10,
          }}
        >
          {item.servicio && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.accentDim,
                  borderRadius: 8,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: COLORS.accent + "33",
                }}
              >
                <Text style={{ fontSize: 16 }}>✂️</Text>
              </View>
              <View>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 11,
                    letterSpacing: 0.8,
                  }}
                >
                  SERVICIO
                </Text>
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {item.servicio}
                </Text>
              </View>
            </View>
          )}

          {item.telefono && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.whatsappDim,
                  borderRadius: 8,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: COLORS.whatsapp + "33",
                }}
              >
                <Text style={{ fontSize: 16 }}>📱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 11,
                    letterSpacing: 0.8,
                  }}
                >
                  TELÉFONO
                </Text>
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {item.telefono}
                </Text>
              </View>
            </View>
          )}

          {/* Acciones */}
          {!esCancelado && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {item.telefono && (
                <TouchableOpacity
                  onPress={abrirWhatsApp}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: COLORS.whatsappDim,
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: COLORS.whatsapp + "44",
                  }}
                >
                  <Text style={{ fontSize: 15 }}>💬</Text>
                  <Text
                    style={{
                      color: COLORS.whatsapp,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    WhatsApp
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={confirmarCancelacion}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: COLORS.dangerDim,
                  borderRadius: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: COLORS.danger + "44",
                }}
              >
                <Text style={{ fontSize: 15 }}>✕</Text>
                <Text
                  style={{
                    color: COLORS.danger,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editarNombre, setEditarNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [filtro, setFiltro] = useState<
    "todos" | "pendiente" | "confirmado" | "cancelado"
  >("todos");

  const cargarTurnos = async () => {
    const { data } = await supabase
      .from("turnos")
      .select("*")
      .not("nombre_cliente", "is", null) // solo turnos reservados por clientes
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });
    if (data) setTurnos(data);
  };

  const cargarPerfil = async () => {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id;
    if (!userId) return;

    const { data: perfilData } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (perfilData?.avatar) {
      perfilData.avatar = `${perfilData.avatar}?t=${Date.now()}`;
    }

    setPerfil(perfilData);
  };

  useEffect(() => {
    cargarPerfil();
    cargarTurnos();
  }, []);

  const cancelarTurno = async (id: string) => {
    await supabase.from("turnos").update({ estado: "cancelado" }).eq("id", id);
    cargarTurnos();
  };

  const handleCambiarNombre = async () => {
    if (!nuevoNombre) return;
    await supabase
      .from("perfiles")
      .update({ nombre: nuevoNombre })
      .eq("id", perfil.id);
    setPerfil({ ...perfil, nombre: nuevoNombre });
    setEditarNombre(false);
  };

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const turnosFiltrados =
    filtro === "todos" ? turnos : turnos.filter((t) => t.estado === filtro);

  const pendientes = turnos.filter((t) => t.estado === "pendiente").length;
  const confirmados = turnos.filter((t) => t.estado === "confirmado").length;
  const cancelados = turnos.filter((t) => t.estado === "cancelado").length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: COLORS.bg,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 12,
                letterSpacing: 1.5,
                marginBottom: 4,
              }}
            >
              BIENVENIDO
            </Text>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: -0.5,
              }}
            >
              {perfil?.nombre || "Mi negocio"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setMenuVisible(!menuVisible)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: COLORS.surface,
              borderWidth: 2,
              borderColor: menuVisible ? COLORS.accent : COLORS.border,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {perfil?.avatar ? (
              <Image
                source={{ uri: perfil.avatar }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <Text
                style={{
                  color: COLORS.accentLight,
                  fontWeight: "800",
                  fontSize: 18,
                }}
              >
                {perfil?.nombre?.[0]?.toUpperCase() || "U"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Menú */}
        {menuVisible && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              marginTop: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: "hidden",
            }}
          >
            {[
              {
                label: "Cambiar foto",
                icon: "📷",
                onPress: async () => {
                  const { data } = await supabase.auth.getUser();
                  const userId = data?.user?.id;
                  if (!userId) return;
                  await cambiarFoto(userId, setPerfil);
                  setMenuVisible(false);
                },
              },
              {
                label: "Cambiar nombre",
                icon: "✏️",
                onPress: () => {
                  setEditarNombre(true);
                  setMenuVisible(false);
                },
              },
              {
                label: "Configuración",
                icon: "⚙️",
                onPress: () => {
                  router.push("/configuracion");
                  setMenuVisible(false);
                },
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={item.onPress}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 10 }}>
                  {item.icon}
                </Text>
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={handleCerrarSesion}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
              }}
            >
              <Text style={{ fontSize: 16, marginRight: 10 }}>🚪</Text>
              <Text
                style={{
                  color: COLORS.danger,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Cerrar sesión
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={turnosFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[
                {
                  label: "Pendientes",
                  value: pendientes,
                  color: COLORS.warning,
                  bg: COLORS.warningDim,
                },
                {
                  label: "Confirmados",
                  value: confirmados,
                  color: COLORS.success,
                  bg: COLORS.successDim,
                },
                {
                  label: "Cancelados",
                  value: cancelados,
                  color: COLORS.danger,
                  bg: COLORS.dangerDim,
                },
              ].map((stat, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: stat.bg,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: stat.color + "44",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: stat.color,
                      fontSize: 24,
                      fontWeight: "800",
                    }}
                  >
                    {stat.value}
                  </Text>
                  <Text
                    style={{
                      color: stat.color + "BB",
                      fontSize: 10,
                      fontWeight: "600",
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    {stat.label.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Botón gestionar horarios */}
            <TouchableOpacity
              onPress={() => router.push("/nuevo-turno")}
              style={{
                backgroundColor: COLORS.accent,
                padding: 16,
                borderRadius: 14,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: COLORS.accent,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                  fontSize: 15,
                  letterSpacing: 0.3,
                }}
              >
                🗓 Gestionar horarios
              </Text>
            </TouchableOpacity>

            {/* Filtros */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {(["todos", "pendiente", "confirmado", "cancelado"] as const).map(
                (f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFiltro(f)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor:
                        filtro === f ? COLORS.accent : COLORS.surface,
                      borderWidth: 1,
                      borderColor: filtro === f ? COLORS.accent : COLORS.border,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: filtro === f ? "white" : COLORS.textMuted,
                        fontSize: 10,
                        fontWeight: "700",
                        letterSpacing: 0.5,
                      }}
                    >
                      {f === "todos"
                        ? "TODOS"
                        : f === "pendiente"
                          ? "PEND."
                          : f === "confirmado"
                            ? "CONF."
                            : "CANC."}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 14,
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
                Turnos reservados
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                {turnosFiltrados.length} resultado
                {turnosFiltrados.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
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
            <Text style={{ fontSize: 36, marginBottom: 12 }}>💬</Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Todavía no hay turnos reservados.{"\n"}Los turnos del bot de
              WhatsApp aparecerán acá.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TurnoCard item={item} onCancelar={cancelarTurno} />
        )}
      />

      {/* Modal cambiar nombre */}
      <Modal visible={editarNombre} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#00000088",
          }}
        >
          <View
            style={{
              width: "85%",
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: 18,
                fontWeight: "700",
                marginBottom: 6,
              }}
            >
              Cambiar nombre
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              Este nombre se mostrará en tu perfil.
            </Text>
            <TextInput
              placeholder="Nuevo nombre del negocio"
              placeholderTextColor={COLORS.textMuted}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              style={{
                backgroundColor: COLORS.bg,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 14,
                color: COLORS.textPrimary,
                fontSize: 15,
                marginBottom: 20,
              }}
            />
            <TouchableOpacity
              onPress={handleCambiarNombre}
              style={{
                backgroundColor: COLORS.accent,
                padding: 14,
                borderRadius: 12,
                marginBottom: 10,
                shadowColor: COLORS.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                Guardar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditarNombre(false)}
              style={{ padding: 12 }}
            >
              <Text
                style={{
                  color: COLORS.textSecondary,
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
