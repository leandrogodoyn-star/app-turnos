import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
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
  textPrimary: "#EEEEF5",
  textSecondary: "#8B8FA8",
  textMuted: "#4A4E6A",
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DURACIONES = [15, 20, 30, 45, 60, 90];
const ANTICIPACIONES = [
  { label: "Sin límite", value: 0 },
  { label: "30 minutos", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
  { label: "1 día", value: 1440 },
];

function Seccion({ titulo, children }: { titulo: string; children: any }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: COLORS.textMuted,
          fontSize: 11,
          letterSpacing: 1.4,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        {titulo}
      </Text>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Fila({
  label,
  children,
  ultimo,
}: {
  label: string;
  children: any;
  ultimo?: boolean;
}) {
  return (
    <View
      style={{
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: ultimo ? 0 : 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function Configuracion() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [codigoBot, setCodigoBot] = useState("");
  const [mpHabilitado, setMpHabilitado] = useState(false);
  const [mpObligatorio, setMpObligatorio] = useState(false);
  const [mpAccessToken, setMpAccessToken] = useState("");

  const [nombre, setNombre] = useState("");
  const [duracion, setDuracion] = useState(30);
  const [horaApertura, setHoraApertura] = useState("09:00");
  const [horaCierre, setHoraCierre] = useState("18:00");
  const [diasTrabajo, setDiasTrabajo] = useState<number[]>([1, 2, 3, 4, 5]);
  const [anticipacion, setAnticipacion] = useState(60);
  const [limiteTurnos, setLimiteTurnos] = useState(10);

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    const { data } = await supabase.auth.getUser();
    const id = data?.user?.id;
    if (!id) return;
    setUserId(id);

    const { data: perfil } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (perfil) {
      setNombre(perfil.nombre || "");
      setCodigoBot(perfil.codigo_bot || "");
      setMpHabilitado(perfil.mp_habilitado || false);
      setMpObligatorio(perfil.mp_obligatorio || false);
      setMpAccessToken(perfil.mp_access_token || "");
      setDuracion(perfil.duracion_turno || 30);
      setHoraApertura(perfil.hora_apertura?.slice(0, 5) || "09:00");
      setHoraCierre(perfil.hora_cierre?.slice(0, 5) || "18:00");
      setDiasTrabajo(perfil.dias_trabajo?.map(Number) || [1, 2, 3, 4, 5]);
      setAnticipacion(perfil.anticipacion_minima ?? 60);
      setLimiteTurnos(perfil.limite_turnos_dia || 10);
    }

    setCargando(false);
  };

  const toggleDia = (dia: number) => {
    setDiasTrabajo((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  };

  const guardar = async () => {
    if (!userId) return;
    if (!nombre.trim()) {
      Alert.alert("Atención", "El nombre no puede estar vacío.");
      return;
    }

    setGuardando(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nombre: nombre.trim(),
        duracion_turno: duracion,
        hora_apertura: horaApertura,
        hora_cierre: horaCierre,
        dias_trabajo: diasTrabajo,
        anticipacion_minima: anticipacion,
        limite_turnos_dia: limiteTurnos,
        mp_habilitado: mpHabilitado,
        mp_obligatorio: mpObligatorio,
        mp_access_token: mpAccessToken.trim() || null,
      })
      .eq("id", userId);

    setGuardando(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Regenerar horarios con nueva configuración
      await fetch("https://app-turnos-4qaf.onrender.com/regenerar-horarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      Alert.alert(
        "✅ Guardado",
        "La configuración se actualizó correctamente.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  };

  if (cargando) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

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
          Configuración
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Negocio */}
        <Seccion titulo="NEGOCIO">
          <Fila label="Nombre" ultimo>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              style={{
                color: COLORS.textPrimary,
                fontSize: 14,
                textAlign: "right",
                minWidth: 140,
              }}
              placeholderTextColor={COLORS.textMuted}
              placeholder="Nombre del negocio"
            />
          </Fila>
        </Seccion>

        {/* Turnos */}
        <Seccion titulo="TURNOS">
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              Duración del turno
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DURACIONES.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDuracion(d)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor:
                        duracion === d ? COLORS.accent : COLORS.bg,
                      borderWidth: 1,
                      borderColor:
                        duracion === d ? COLORS.accent : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        color: duracion === d ? "white" : COLORS.textMuted,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {d} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <Fila label="Anticipación mínima">
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                justifyContent: "flex-end",
                maxWidth: 220,
              }}
            >
              {ANTICIPACIONES.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  onPress={() => setAnticipacion(a.value)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor:
                      anticipacion === a.value ? COLORS.accent : COLORS.bg,
                    borderWidth: 1,
                    borderColor:
                      anticipacion === a.value ? COLORS.accent : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        anticipacion === a.value ? "white" : COLORS.textMuted,
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Fila>
          <Fila label="Límite por día" ultimo>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <TouchableOpacity
                onPress={() => setLimiteTurnos(Math.max(1, limiteTurnos - 1))}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: COLORS.bg,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: 18,
                    lineHeight: 20,
                  }}
                >
                  −
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontSize: 16,
                  fontWeight: "700",
                  minWidth: 28,
                  textAlign: "center",
                }}
              >
                {limiteTurnos}
              </Text>
              <TouchableOpacity
                onPress={() => setLimiteTurnos(Math.min(50, limiteTurnos + 1))}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: COLORS.bg,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: 18,
                    lineHeight: 20,
                  }}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </Fila>
        </Seccion>

        {/* Horario */}
        <Seccion titulo="HORARIO DE ATENCIÓN">
          <Fila label="Apertura">
            <TextInput
              value={horaApertura}
              onChangeText={setHoraApertura}
              placeholder="09:00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
              style={{
                color: COLORS.textPrimary,
                fontSize: 14,
                textAlign: "right",
              }}
            />
          </Fila>
          <Fila label="Cierre" ultimo>
            <TextInput
              value={horaCierre}
              onChangeText={setHoraCierre}
              placeholder="18:00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
              style={{
                color: COLORS.textPrimary,
                fontSize: 14,
                textAlign: "right",
              }}
            />
          </Fila>
        </Seccion>

        {/* Días */}
        <Seccion titulo="DÍAS DE TRABAJO">
          <View
            style={{
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {DIAS.map((dia, i) => {
              const activo = diasTrabajo.includes(i);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleDia(i)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: activo ? COLORS.accent : COLORS.bg,
                    borderWidth: 1,
                    borderColor: activo ? COLORS.accent : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: activo ? "white" : COLORS.textMuted,
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {dia}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Seccion>

        {/* Link de reservas */}
        <Seccion titulo="LINK DE RESERVAS">
          <Fila label="Código" ultimo={false}>
            <Text
              style={{
                color: COLORS.accentLight,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              {codigoBot || "—"}
            </Text>
          </Fila>
          <Fila label="Compartir link" ultimo>
            <TouchableOpacity
              onPress={() => {
                const link = `https://harmonious-fudge-da1512.netlify.app/reservar/${codigoBot}`;
                Alert.alert("Tu link de reservas", link, [
                  { text: "Cerrar", style: "cancel" },
                  {
                    text: "Copiar",
                    onPress: () => {
                      import("expo-clipboard").then((Clipboard) => {
                        Clipboard.setStringAsync(link);
                        Alert.alert(
                          "✅ Copiado",
                          "Link copiado al portapapeles.",
                        );
                      });
                    },
                  },
                ]);
              }}
            >
              <Text
                style={{
                  color: COLORS.accentLight,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Ver y copiar 📋
              </Text>
            </TouchableOpacity>
          </Fila>
        </Seccion>
        {/* Mercado Pago */}
        <Seccion titulo="MERCADO PAGO">
          <Fila label="Habilitar pagos online">
            <TouchableOpacity
              onPress={() => setMpHabilitado(!mpHabilitado)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                backgroundColor: mpHabilitado ? COLORS.accent : COLORS.border,
                justifyContent: "center",
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "white",
                  alignSelf: mpHabilitado ? "flex-end" : "flex-start",
                }}
              />
            </TouchableOpacity>
          </Fila>
          {mpHabilitado && (
            <>
              <Fila label="Pago obligatorio">
                <TouchableOpacity
                  onPress={() => setMpObligatorio(!mpObligatorio)}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: mpObligatorio
                      ? COLORS.accent
                      : COLORS.border,
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "white",
                      alignSelf: mpObligatorio ? "flex-end" : "flex-start",
                    }}
                  />
                </TouchableOpacity>
              </Fila>
              <Fila label="Access Token" ultimo>
                <TextInput
                  value={mpAccessToken}
                  onChangeText={setMpAccessToken}
                  placeholder="APP_USR-..."
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: 12,
                    textAlign: "right",
                    minWidth: 140,
                  }}
                />
              </Fila>
            </>
          )}
        </Seccion>

        {/* Botón guardar */}
        <TouchableOpacity
          onPress={guardar}
          disabled={guardando}
          style={{
            backgroundColor: COLORS.accent,
            padding: 18,
            borderRadius: 14,
            alignItems: "center",
            marginTop: 8,
            opacity: guardando ? 0.7 : 1,
            shadowColor: COLORS.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {guardando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
              Guardar cambios
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
