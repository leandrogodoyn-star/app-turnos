import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AdBanner from "../../components/BannerAd";
import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";
import { cambiarFoto } from "../../lib/utilidades";

type EstadoReserva = "pendiente" | "completado";

type Reserva = {
  id: string;
  admin_id: string;
  horario_id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio?: string;
  fecha?: string;
  hora?: string;
  estado: EstadoReserva;
};

function Badge({ estado }: { estado: EstadoReserva }) {
  const config = {
    pendiente: {
      color: COLORS.warning,
      bg: COLORS.warningDim,
      label: "Pendiente",
    },
    completado: {
      color: COLORS.success,
      bg: COLORS.successDim,
      label: "Completado",
    },
  }[estado];

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

function ReservaCard({
  item,
  onCancelar,
  onCompletar,
  onBorrar,
}: {
  item: Reserva;
  onCancelar: (id: string, horarioId: string) => void;
  onCompletar: (id: string, horarioId: string) => void;
  onBorrar: (id: string) => void;
}) {
  const esPendiente = item.estado === "pendiente";
  const esCompletado = item.estado === "completado";
  const [expandido, setExpandido] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const esCompletadoRef = useRef(esCompletado);
  useEffect(() => {
    esCompletadoRef.current = esCompletado;
  }, [esCompletado]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        esCompletadoRef.current && Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => {
        if (esCompletadoRef.current && g.dx > 0) translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (esCompletadoRef.current && g.dx > 80) {
          Alert.alert("Borrar turno", "¿Borrar este turno completado?", [
            {
              text: "No",
              style: "cancel",
              onPress: () =>
                Animated.spring(translateX, {
                  toValue: 0,
                  useNativeDriver: true,
                }).start(),
            },
            {
              text: "Sí, borrar",
              style: "destructive",
              onPress: () => onBorrar(item.id),
            },
          ]);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const abrirWhatsApp = () => {
    if (!item.cliente_telefono) return;
    const numero = item.cliente_telefono.replace(/\D/g, "");
    const mensaje = `Hola ${item.cliente_nombre || ""}, te confirmamos tu turno para el ${item.fecha} a las ${item.hora}. ¡Te esperamos!`;
    Linking.openURL(
      `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`,
    );
  };

  const confirmarCancelacion = () => {
    Alert.alert(
      "Cancelar turno",
      `¿Cancelás el turno de ${item.cliente_nombre || "este cliente"} a las ${item.hora}? El horario quedará libre para otra persona.`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, cancelar",
          style: "destructive",
          onPress: () => onCancelar(item.id, item.horario_id),
        },
      ],
    );
  };

  const confirmarCompletar = () => {
    Alert.alert(
      "Turno completado",
      `¿Marcás el turno de ${item.cliente_nombre || "este cliente"} como completado?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Sí, completado",
          onPress: () => onCompletar(item.id, item.horario_id),
        },
      ],
    );
  };

  const barColor =
    item.estado === "completado" ? COLORS.success : COLORS.accent;

  return (
    <Animated.View
      style={{ transform: [{ translateX }] }}
      {...panResponder.panHandlers}
    >
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
          opacity: esCompletado ? 0.8 : 1,
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: barColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            paddingLeft: 20,
          }}
        >
          <Avatar nombre={item.cliente_nombre} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                color: COLORS.textPrimary,
                fontSize: 15,
                fontWeight: "700",
                marginBottom: 3,
              }}
            >
              {item.cliente_nombre || "Cliente sin nombre"}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                🕐 {item.hora}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>•</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                📅 {item.fecha}
              </Text>
            </View>
            {item.servicio && (
              <Text
                style={{
                  color: COLORS.accentLight,
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                ✂️ {item.servicio}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Badge estado={item.estado} />
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              {expandido ? "▲" : "▼"}
            </Text>
          </View>
        </View>

        {expandido && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              padding: 16,
              paddingLeft: 20,
              gap: 10,
              backgroundColor: '#1C1F2B'
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

            {item.cliente_telefono && (
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
                    {item.cliente_telefono}
                  </Text>
                </View>
              </View>
            )}

            {esPendiente && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {item.cliente_telefono && (
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
                    onPress={confirmarCompletar}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      backgroundColor: COLORS.successDim,
                      borderRadius: 10,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: COLORS.success + "44",
                    }}
                  >
                    <Text style={{ fontSize: 15 }}>✅</Text>
                    <Text
                      style={{
                        color: COLORS.success,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Completado
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={confirmarCancelacion}
                  style={{
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
                    Cancelar turno
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {esCompletado && (
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Deslizá hacia la derecha para borrar
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function hoyISO() {
  const h = new Date();
  const yyyy = h.getFullYear();
  const mm = String(h.getMonth() + 1).padStart(2, "0");
  const dd = String(h.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function generarDiasFiltro() {
  const dias = [];
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const hoy = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dias.push({
      value: `${yyyy}-${mm}-${dd}`,
      label: i === 0 ? "Hoy" : i === 1 ? "Mañ" : `${d.getDate()} ${meses[d.getMonth()]}`,
      diaSemana: diasSemana[d.getDay()],
    });
  }
  return dias;
}

const DIAS_FILTRO = generarDiasFiltro();

export default function Dashboard() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [perfil, setPerfil] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editarNombre, setEditarNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "pendiente" | "completado">("todos");
  const [filtroFecha, setFiltroFecha] = useState<string | null>(null);

  const cargarReservas = async (userId: string) => {
    try {

      const { data, error } = await supabase
        .from("reservas")
        .select(
          `
          id,
          admin_id,
          horario_id,
          cliente_nombre,
          cliente_telefono,
          servicio,
          estado,
          horarios (fecha, hora, disponible)
        `,
        )
        .eq("admin_id", userId)
        .order("horario_id", { ascending: true });

      if (error) throw error;

      if (data) {
        const reservasFormateadas: Reserva[] = data.map((r: any) => ({
          id: r.id,
          admin_id: r.admin_id,
          horario_id: r.horario_id,
          cliente_nombre: r.cliente_nombre,
          cliente_telefono: r.cliente_telefono,
          servicio: r.servicio,
          fecha: r.horarios?.fecha,
          hora: r.horarios?.hora?.slice(0, 5),
          estado: (r.estado === "completado"
            ? "completado"
            : "pendiente") as EstadoReserva,
        }));

        reservasFormateadas.sort((a, b) => {
          if (a.fecha !== b.fecha)
            return (a.fecha || "") > (b.fecha || "") ? 1 : -1;
          return (a.hora || "") > (b.hora || "") ? 1 : -1;
        });

        setReservas(reservasFormateadas);
      }
    } catch (err: any) {
      Alert.alert("Error", "No se pudieron cargar las reservas. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const cargarPerfil = async (userId: string) => {
    try {

      const { data: perfilData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (perfilData?.avatar) {
        const urlLimpia = perfilData.avatar.split("?")[0];
        perfilData.avatar = `${urlLimpia}?t=${Date.now()}`;
      }

      setPerfil(perfilData);
    } catch (err: any) {
      console.error("[Dashboard] Error loading profile:", err);
      Alert.alert("Atención", "No pudimos cargar tu perfil de negocio. Asegurate de completar tus datos en Configuración.");
    }
  };

  useEffect(() => {
    const initData = async () => {
      setCargando(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        console.log("[Dashboard] Initializing for UserID:", userId);

        if (!userId) {
          router.replace("/login");
          return;
        }

        // Parallel load
        await Promise.all([
          cargarPerfil(userId),
          cargarReservas(userId)
        ]);

      } catch (err) {
        console.error("[Dashboard] Error in initData:", err);
      } finally {
        setCargando(false);
      }
    };

    initData();

    // Suscripción Realtime (sin recargas completas, solo para cambios de otros)
    const channel = supabase
      .channel("reservas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservas" },
        async (payload) => {
          console.log("[Dashboard] Realtime change detected:", payload.eventType);
          // Refetch silent
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) cargarReservas(session.user.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cancelarReserva = async (id: string, horarioId: string) => {
    try {
      const { error } = await supabase.from("reservas").delete().eq("id", id);
      if (error) throw error;
      await supabase
        .from("horarios")
        .update({ disponible: true })
        .eq("id", horarioId);
      setReservas((prev) => prev.filter((r) => r.id !== id));
    } catch {
      Alert.alert("Error", "No se pudo cancelar el turno. Intenta de nuevo.");
    }
  };

  const completarReserva = async (id: string, horarioId: string) => {
    try {
      const { error } = await supabase
        .from("reservas")
        .update({ estado: "completado" })
        .eq("id", id);
      if (error) throw error;
      await supabase
        .from("horarios")
        .update({ disponible: false })
        .eq("id", horarioId);
      setReservas((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, estado: "completado" as EstadoReserva } : r,
        ),
      );
    } catch {
      Alert.alert("Error", "No se pudo completar el turno. Intenta de nuevo.");
    }
  };

  const borrarReserva = async (id: string) => {
    try {
      const { error } = await supabase.from("reservas").delete().eq("id", id);
      if (error) throw error;
      setReservas((prev) => prev.filter((r) => r.id !== id));
    } catch {
      Alert.alert("Error", "No se pudo borrar el turno. Intenta de nuevo.");
    }
  };

  const handleCambiarNombre = async () => {
    if (!nuevoNombre || !perfil?.id) return;
    await supabase
      .from("profiles")
      .update({ nombre: nuevoNombre })
      .eq("id", perfil.id);
    setPerfil({ ...perfil, nombre: nuevoNombre });
    setEditarNombre(false);
  };

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const hoy = hoyISO();
  const reservasFiltradas = reservas.filter((r) => {
    const pasaFecha = filtroFecha ? r.fecha === filtroFecha : true;
    const pasaEstado = filtro === "todos" || r.estado === filtro;
    return pasaFecha && pasaEstado;
  });
  const pendientes = reservas.filter((r) => r.estado === "pendiente").length;
  const completados = reservas.filter((r) => r.estado === "completado").length;
  const turnosHoy = reservas.filter((r) => r.fecha === hoy).length;

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
            {!perfil?.is_premium && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.border }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (perfil?.reservas_mes || 0) >= 50 ? COLORS.danger : COLORS.success, marginRight: 8 }} />
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" }}>
                  {perfil?.reservas_mes || 0} / 60 turnos
                </Text>
              </View>
            )}
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

        {/* Botón Compartir Link Rápido */}
        <TouchableOpacity
          onPress={() => {
            if (!perfil?.codigo_bot) {
              Alert.alert("Link no disponible", "Primero configurá el nombre de tu negocio en Configuración.");
              return;
            }
            const link = `https://harmonious-fudge-da1512.netlify.app/reservar/${perfil.codigo_bot}`;
            Share.share({
              message: `📅 ¡Hola! Podés reservar tu turno online acá: ${link}`,
              url: link,
            });
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: COLORS.accentDim,
            marginTop: 20,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: COLORS.accent + "44",
          }}
        >
          <Text style={{ fontSize: 16 }}>🔗</Text>
          <Text style={{ color: COLORS.accentLight, fontWeight: "700", fontSize: 14 }}>
            Compartir link de reservas
          </Text>
        </TouchableOpacity>

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
                icon: "⚙️", onPress: () => {
                  router.push("/configuracion");
                  setMenuVisible(false);
                },
              },
              {
                label: "Estadísticas",
                icon: "📊",
                onPress: () => {
                  router.push("/estadisticas");
                  setMenuVisible(false);
                },
              },
              {
                label: "Servicios",
                icon: "✂️",
                onPress: () => {
                  router.push("/servicios");
                  setMenuVisible(false);
                },
              },
              {
                label: "Profesionales",
                icon: "👥",
                onPress: () => {
                  router.push("/profesionales" as any);
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
        data={reservasFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            {/* Stats */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[
                {
                  label: "Hoy",
                  value: turnosHoy,
                  color: COLORS.accent,
                  bg: COLORS.accentDim,
                },
                {
                  label: "Pendientes",
                  value: pendientes,
                  color: COLORS.warning,
                  bg: COLORS.warningDim,
                },
                {
                  label: "Completados",
                  value: completados,
                  color: COLORS.success,
                  bg: COLORS.successDim,
                },
              ].map((stat, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    if (stat.label === "Hoy") {
                      setFiltroFecha(filtroFecha === hoy ? null : hoy);
                    }
                  }}
                  activeOpacity={stat.label === "Hoy" ? 0.7 : 1}
                  style={{
                    flex: 1,
                    backgroundColor: stat.bg,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor:
                      stat.label === "Hoy" && filtroFecha === hoy
                        ? stat.color
                        : stat.color + "44",
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
                </TouchableOpacity>
              ))}
            </View>

            {/* Filtro por fecha */}
            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1.5,
                marginBottom: 10,
              }}
            >
              FILTRAR POR FECHA
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
            >
              <TouchableOpacity
                onPress={() => setFiltroFecha(null)}
                style={{
                  backgroundColor:
                    filtroFecha === null ? COLORS.accent : COLORS.surface,
                  borderRadius: 12,
                  padding: 12,
                  marginRight: 8,
                  alignItems: "center",
                  minWidth: 56,
                  borderWidth: 1,
                  borderColor:
                    filtroFecha === null ? COLORS.accent : COLORS.border,
                }}
              >
                <Text
                  style={{
                    color: filtroFecha === null ? "white" : COLORS.textMuted,
                    fontSize: 10,
                    fontWeight: "700",
                    marginBottom: 2,
                    letterSpacing: 0.5,
                  }}
                >
                  TODOS
                </Text>
                <Text
                  style={{
                    color: filtroFecha === null ? "white" : COLORS.textSecondary,
                    fontSize: 16,
                    fontWeight: "800",
                  }}
                >
                  ∞
                </Text>
              </TouchableOpacity>
              {DIAS_FILTRO.map((dia) => {
                const sel = filtroFecha === dia.value;
                return (
                  <TouchableOpacity
                    key={dia.value}
                    onPress={() =>
                      setFiltroFecha(sel ? null : dia.value)
                    }
                    style={{
                      backgroundColor: sel ? COLORS.accent : COLORS.surface,
                      borderRadius: 12,
                      padding: 12,
                      marginRight: 8,
                      alignItems: "center",
                      minWidth: 56,
                      borderWidth: 1,
                      borderColor: sel ? COLORS.accent : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        color: sel ? "white" : COLORS.textMuted,
                        fontSize: 10,
                        fontWeight: "700",
                        marginBottom: 2,
                        letterSpacing: 0.5,
                      }}
                    >
                      {dia.diaSemana.toUpperCase()}
                    </Text>
                    <Text
                      style={{
                        color: sel ? "white" : COLORS.textPrimary,
                        fontSize: 15,
                        fontWeight: "800",
                      }}
                    >
                      {dia.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

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
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                🗓 Gestionar horarios
              </Text>
            </TouchableOpacity>

            {/* Filtros */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {(["todos", "pendiente", "completado"] as const).map((f) => (
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
                    }}
                  >
                    {f === "todos"
                      ? "TODOS"
                      : f === "pendiente"
                        ? "PENDIENTES"
                        : "COMPLETADOS"}
                  </Text>
                </TouchableOpacity>
              ))}
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
                {filtroFecha
                  ? filtroFecha === hoy
                    ? "Turnos de hoy"
                    : `Turnos del ${filtroFecha}`
                  : "Todos los turnos"}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                {reservasFiltradas.length} resultado
                {reservasFiltradas.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          cargando ? (
            <View style={{ padding: 60, alignItems: "center" }}>
              <ActivityIndicator color={COLORS.accent} size="large" />
              <Text
                style={{ color: COLORS.textMuted, marginTop: 14, fontSize: 13 }}
              >
                Cargando turnos...
              </Text>
            </View>
          ) : (
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
                Todavía no hay turnos reservados.{"\n"}Cuando un cliente reserve
                desde tu link, aparecerá acá.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ReservaCard
            item={item}
            onCancelar={cancelarReserva}
            onCompletar={completarReserva}
            onBorrar={borrarReserva}
          />
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
      <AdBanner isPremium={perfil?.is_premium} />
    </View>
  );
}
