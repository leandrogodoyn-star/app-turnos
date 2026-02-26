import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  textPrimary: "#EEEEF5",
  textSecondary: "#8B8FA8",
  textMuted: "#4A4E6A",
};

function generarDias() {
  const dias = [];
  const hoy = new Date();
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  for (let i = 0; i < 14; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dias.push({
      value: `${yyyy}-${mm}-${dd}`,
      label: `${d.getDate()} ${meses[d.getMonth()]}`,
      diaSemana: diasSemana[d.getDay()],
    });
  }
  return dias;
}

const HORAS_OPCIONES = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`,
);

function HoraPicker({
  valor,
  onChange,
  label,
}: {
  valor: string;
  onChange: (h: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 11,
            marginBottom: 6,
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={{
            backgroundColor: COLORS.surfaceAlt,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            {valor}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal visible={open} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000088",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 20,
              width: "75%",
              borderWidth: 1,
              borderColor: COLORS.border,
              maxHeight: 400,
            }}
          >
            <Text
              style={{
                color: COLORS.textPrimary,
                fontWeight: "700",
                fontSize: 16,
                marginBottom: 14,
              }}
            >
              Seleccionar {label.toLowerCase()}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {HORAS_OPCIONES.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => {
                    onChange(h);
                    setOpen(false);
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 6,
                    backgroundColor:
                      valor === h ? COLORS.accentDim : "transparent",
                    borderWidth: 1,
                    borderColor:
                      valor === h ? COLORS.accent + "44" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color:
                        valor === h ? COLORS.accentLight : COLORS.textSecondary,
                      fontWeight: valor === h ? "700" : "400",
                      textAlign: "center",
                      fontSize: 15,
                    }}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={{ marginTop: 10, padding: 10 }}
            >
              <Text style={{ color: COLORS.textMuted, textAlign: "center" }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

type SlotInfo = {
  id: string;
  hora: string;
  disponible: boolean;
  reservado: boolean;
};

export default function GestionarHorarios() {
  const [eventoDelDia, setEventoDelDia] = useState<any>(null);
  const [modalEvento, setModalEvento] = useState(false);
  const [formEvento, setFormEvento] = useState({
    tipo: "feriado",
    hora_inicio: "09:00",
    hora_fin: "18:00",
    servicio_especial: "",
    descripcion: "",
  });

  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [serviciosLista, setServiciosLista] = useState<
    { id: string; nombre: string }[]
  >([]);

  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("19:00");
  const [modalRango, setModalRango] = useState(false);
  const [horaInicioTemp, setHoraInicioTemp] = useState("08:00");
  const [horaFinTemp, setHoraFinTemp] = useState("19:00");

  const dias = generarDias();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data?.user?.id;
      if (!id) return;
      setUserId(id);

      const { data: perfil } = await supabase
        .from("profiles")
        .select("hora_apertura, hora_cierre")
        .eq("id", id)
        .single();

      if (perfil?.hora_apertura) {
        const apertura = perfil.hora_apertura.slice(0, 5);
        setHoraInicio(apertura);
        setHoraInicioTemp(apertura);
      }
      if (perfil?.hora_cierre) {
        const cierre = perfil.hora_cierre.slice(0, 5);
        setHoraFin(cierre);
        setHoraFinTemp(cierre);
      }

      // Cargar servicios
      const { data: servicios } = await supabase
        .from("servicios")
        .select("id, nombre")
        .eq("admin_id", id)
        .eq("activo", true);

      setServiciosLista(servicios || []);
    });
  }, []);

  useEffect(() => {
    if (!fechaSeleccionada || !userId) return;
    cargarSlots();
    cargarEvento();
  }, [fechaSeleccionada, userId]);

  const cargarEvento = async () => {
    const { data } = await supabase
      .from("eventos_especiales")
      .select("*")
      .eq("admin_id", userId)
      .eq("fecha", fechaSeleccionada)
      .single();
    setEventoDelDia(data || null);
  };

  const cargarSlots = async () => {
    if (!userId || !fechaSeleccionada) return;
    setCargando(true);

    const resultado = await supabase
      .from("horarios")
      .select("id, hora, disponible")
      .eq("admin_id", userId)
      .eq("fecha", fechaSeleccionada)
      .order("hora", { ascending: true });

    const horarios = resultado.data;

    if (!horarios || horarios.length === 0) {
      setSlots([]);
      setCargando(false);
      return;
    }

    const horarioIds = horarios.map((h) => h.id);
    const { data: reservas } = await supabase
      .from("reservas")
      .select("horario_id")
      .in("horario_id", horarioIds);

    const reservadosSet = new Set(reservas?.map((r) => r.horario_id) ?? []);

    const [hIni, mIni] = horaInicio.split(":").map(Number);
    const [hFin, mFin] = horaFin.split(":").map(Number);
    const inicioMins = hIni * 60 + mIni;
    const finMins = hFin * 60 + mFin;

    const slotsFiltrados: SlotInfo[] = horarios
      .filter((h) => {
        const [hh, mm] = h.hora.slice(0, 5).split(":").map(Number);
        const mins = hh * 60 + mm;
        return mins >= inicioMins && mins < finMins;
      })
      .map((h) => ({
        id: h.id,
        hora: h.hora.slice(0, 5),
        disponible: h.disponible,
        reservado: reservadosSet.has(h.id),
      }));

    setSlots(slotsFiltrados);
    setCargando(false);
  };

  const toggleSlot = async (slot: SlotInfo) => {
    if (slot.reservado) return;
    setGuardando(slot.id);

    const nuevoEstado = !slot.disponible;
    await supabase
      .from("horarios")
      .update({ disponible: nuevoEstado })
      .eq("id", slot.id);
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slot.id ? { ...s, disponible: nuevoEstado } : s,
      ),
    );
    setGuardando(null);
  };

  const getEstado = (slot: SlotInfo) => {
    if (slot.reservado) return "ocupado";
    if (!slot.disponible) return "bloqueado";
    return "disponible";
  };

  const totalDisponibles = slots.filter(
    (s) => getEstado(s) === "disponible",
  ).length;
  const totalBloqueados = slots.filter(
    (s) => getEstado(s) === "bloqueado",
  ).length;
  const totalOcupados = slots.filter((s) => getEstado(s) === "ocupado").length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
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
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 10,
            padding: 10,
            marginRight: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.textMuted,
              fontSize: 11,
              letterSpacing: 1.5,
            }}
          >
            GESTIÓN
          </Text>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: 20,
              fontWeight: "800",
            }}
          >
            Horarios
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setHoraInicioTemp(horaInicio);
            setHoraFinTemp(horaFin);
            setModalRango(true);
          }}
          style={{
            backgroundColor: COLORS.accentDim,
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: COLORS.accent + "44",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 16 }}>⚙️</Text>
          <Text
            style={{
              color: COLORS.accentLight,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {horaInicio} – {horaFin}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 11,
            letterSpacing: 1.5,
            marginBottom: 12,
          }}
        >
          SELECCIONÁ UNA FECHA
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 28 }}
        >
          {dias.map((dia) => {
            const sel = fechaSeleccionada === dia.value;
            return (
              <TouchableOpacity
                key={dia.value}
                onPress={() => setFechaSeleccionada(dia.value)}
                style={{
                  backgroundColor: sel ? COLORS.accent : COLORS.surface,
                  borderRadius: 14,
                  padding: 14,
                  marginRight: 10,
                  alignItems: "center",
                  minWidth: 64,
                  borderWidth: 1,
                  borderColor: sel ? COLORS.accent : COLORS.border,
                  shadowColor: sel ? COLORS.accent : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: sel ? 6 : 0,
                }}
              >
                <Text
                  style={{
                    color: sel ? "white" : COLORS.textMuted,
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  {dia.diaSemana.toUpperCase()}
                </Text>
                <Text
                  style={{
                    color: sel ? "white" : COLORS.textPrimary,
                    fontSize: 18,
                    fontWeight: "800",
                  }}
                >
                  {dia.label.split(" ")[0]}
                </Text>
                <Text
                  style={{
                    color: sel ? "white" : COLORS.textSecondary,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {dia.label.split(" ")[1]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Banner evento del día */}
        {fechaSeleccionada && (
          <TouchableOpacity
            onPress={() => {
              if (eventoDelDia) {
                Alert.alert(
                  "Evento del día",
                  `${eventoDelDia.tipo === "feriado" ? "🔴 Feriado" : eventoDelDia.tipo === "horario_especial" ? "🟡 Horario especial" : "🟣 Servicio especial"}\n\n${eventoDelDia.descripcion || ""}`,
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Eliminar evento",
                      style: "destructive",
                      onPress: async () => {
                        await supabase
                          .from("eventos_especiales")
                          .delete()
                          .eq("id", eventoDelDia.id);
                        setEventoDelDia(null);
                      },
                    },
                  ],
                );
              } else {
                setFormEvento({
                  tipo: "feriado",
                  hora_inicio: horaInicio,
                  hora_fin: horaFin,
                  servicio_especial: "",
                  descripcion: "",
                });
                setModalEvento(true);
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: eventoDelDia
                ? eventoDelDia.tipo === "feriado"
                  ? "#FF5C6A22"
                  : eventoDelDia.tipo === "horario_especial"
                    ? "#FFAA4022"
                    : "#6C63FF22"
                : COLORS.surface,
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: eventoDelDia
                ? eventoDelDia.tipo === "feriado"
                  ? COLORS.danger + "55"
                  : eventoDelDia.tipo === "horario_especial"
                    ? COLORS.warning + "55"
                    : COLORS.accent + "55"
                : COLORS.border,
            }}
          >
            <Text style={{ fontSize: 18 }}>
              {eventoDelDia
                ? eventoDelDia.tipo === "feriado"
                  ? "🔴"
                  : eventoDelDia.tipo === "horario_especial"
                    ? "🟡"
                    : "🟣"
                : "📌"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {eventoDelDia
                  ? eventoDelDia.tipo === "feriado"
                    ? "Feriado / Sin atención"
                    : eventoDelDia.tipo === "horario_especial"
                      ? "Horario especial"
                      : `Servicio especial: ${eventoDelDia.servicio_especial}`
                  : "Marcar día como especial"}
              </Text>
              {eventoDelDia?.descripcion && (
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {eventoDelDia.descripcion}
                </Text>
              )}
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              {eventoDelDia ? "Tocá para eliminar" : "→"}
            </Text>
          </TouchableOpacity>
        )}

        {!fechaSeleccionada ? (
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
            <Text style={{ fontSize: 36, marginBottom: 12 }}>📅</Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Seleccioná una fecha para gestionar los horarios
            </Text>
          </View>
        ) : cargando ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator color={COLORS.accent} size="large" />
            <Text
              style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 13 }}
            >
              Cargando horarios...
            </Text>
          </View>
        ) : slots.length === 0 ? (
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
            <Text style={{ fontSize: 36, marginBottom: 12 }}>⏳</Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              No hay horarios generados para este día.{"\n"}El sistema los
              genera automáticamente cada noche.
            </Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[
                {
                  label: "Disponibles",
                  value: totalDisponibles,
                  color: COLORS.success,
                  bg: COLORS.successDim,
                },
                {
                  label: "Bloqueados",
                  value: totalBloqueados,
                  color: COLORS.danger,
                  bg: COLORS.dangerDim,
                },
                {
                  label: "Reservados",
                  value: totalOcupados,
                  color: COLORS.warning,
                  bg: COLORS.warningDim,
                },
              ].map((s, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: s.bg,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: s.color + "44",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: s.color, fontSize: 20, fontWeight: "800" }}
                  >
                    {s.value}
                  </Text>
                  <Text
                    style={{
                      color: s.color + "BB",
                      fontSize: 10,
                      fontWeight: "600",
                      marginTop: 2,
                      textAlign: "center",
                    }}
                  >
                    {s.label.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: COLORS.textMuted,
                  fontSize: 11,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                LEYENDA — TOCÁ UN HORARIO PARA BLOQUEARLO O HABILITARLO
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {[
                  { color: COLORS.success, label: "Disponible para reservar" },
                  { color: COLORS.danger, label: "Bloqueado por vos" },
                  { color: COLORS.warning, label: "Ya reservado por cliente" },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: item.color,
                      }}
                    />
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {slots.map((slot) => {
                const estado = getEstado(slot);
                const estaGuardando = guardando === slot.id;
                const esOcupado = estado === "ocupado";
                const estilos = {
                  disponible: {
                    bg: COLORS.successDim,
                    border: COLORS.success + "55",
                    text: COLORS.success,
                  },
                  bloqueado: {
                    bg: COLORS.dangerDim,
                    border: COLORS.danger + "55",
                    text: COLORS.danger,
                  },
                  ocupado: {
                    bg: COLORS.warningDim,
                    border: COLORS.warning + "55",
                    text: COLORS.warning,
                  },
                }[estado];

                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={esOcupado || estaGuardando}
                    onPress={() => toggleSlot(slot)}
                    style={{
                      width: "22%",
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      backgroundColor: estilos.bg,
                      borderColor: estilos.border,
                      opacity: esOcupado ? 0.5 : 1,
                    }}
                  >
                    {estaGuardando ? (
                      <ActivityIndicator size="small" color={estilos.text} />
                    ) : (
                      <Text
                        style={{
                          color: estilos.text,
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {slot.hora}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal rango horario */}
      <Modal visible={modalRango} transparent animationType="slide">
        <View
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
                marginBottom: 6,
              }}
            >
              Horario laboral
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              Los turnos se generarán dentro de este rango según la duración
              configurada.
            </Text>
            <View style={{ flexDirection: "row", gap: 16, marginBottom: 28 }}>
              <HoraPicker
                valor={horaInicioTemp}
                onChange={setHoraInicioTemp}
                label="APERTURA"
              />
              <View
                style={{
                  justifyContent: "flex-end",
                  alignItems: "center",
                  paddingBottom: 14,
                }}
              >
                <Text style={{ color: COLORS.textMuted, fontSize: 20 }}>→</Text>
              </View>
              <HoraPicker
                valor={horaFinTemp}
                onChange={setHoraFinTemp}
                label="CIERRE"
              />
            </View>
            <TouchableOpacity
              onPress={async () => {
                if (horaInicioTemp >= horaFinTemp) {
                  Alert.alert(
                    "Error",
                    "La apertura debe ser antes del cierre.",
                  );
                  return;
                }
                setHoraInicio(horaInicioTemp);
                setHoraFin(horaFinTemp);
                setModalRango(false);
                if (userId) {
                  await supabase
                    .from("profiles")
                    .update({
                      hora_apertura: horaInicioTemp,
                      hora_cierre: horaFinTemp,
                    })
                    .eq("id", userId);
                }
                if (fechaSeleccionada) cargarSlots();
              }}
              style={{
                backgroundColor: COLORS.accent,
                padding: 16,
                borderRadius: 14,
                marginBottom: 12,
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
                Guardar rango
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalRango(false)}
              style={{ padding: 12 }}
            >
              <Text
                style={{ color: COLORS.textSecondary, textAlign: "center" }}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal evento especial */}
      <Modal visible={modalEvento} transparent animationType="slide">
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
              Evento especial — {fechaSeleccionada}
            </Text>

            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              TIPO DE EVENTO
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {[
                { value: "feriado", label: "🔴 Feriado" },
                { value: "horario_especial", label: "🟡 Horario especial" },
                { value: "servicio_especial", label: "🟣 Servicio especial" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() =>
                    setFormEvento((p) => ({ ...p, tipo: t.value }))
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor:
                      formEvento.tipo === t.value
                        ? COLORS.accentDim
                        : COLORS.bg,
                    borderWidth: 1,
                    borderColor:
                      formEvento.tipo === t.value
                        ? COLORS.accent + "88"
                        : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        formEvento.tipo === t.value
                          ? COLORS.accentLight
                          : COLORS.textMuted,
                      fontSize: 11,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {formEvento.tipo === "horario_especial" && (
              <>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 11,
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  HORARIO
                </Text>
                <View
                  style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}
                >
                  <HoraPicker
                    valor={formEvento.hora_inicio}
                    onChange={(v) =>
                      setFormEvento((p) => ({ ...p, hora_inicio: v }))
                    }
                    label="APERTURA"
                  />
                  <HoraPicker
                    valor={formEvento.hora_fin}
                    onChange={(v) =>
                      setFormEvento((p) => ({ ...p, hora_fin: v }))
                    }
                    label="CIERRE"
                  />
                </View>
              </>
            )}

            {formEvento.tipo === "servicio_especial" && (
              <>
                <Text
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 11,
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  SERVICIO
                </Text>
                {serviciosLista.length === 0 ? (
                  <Text
                    style={{
                      color: COLORS.textMuted,
                      fontSize: 13,
                      marginBottom: 20,
                    }}
                  >
                    No tenés servicios cargados. Agregá uno en la sección de
                    servicios.
                  </Text>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 180, marginBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {serviciosLista.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() =>
                          setFormEvento((p) => ({
                            ...p,
                            servicio_especial: s.nombre,
                          }))
                        }
                        style={{
                          padding: 14,
                          borderRadius: 12,
                          marginBottom: 8,
                          backgroundColor:
                            formEvento.servicio_especial === s.nombre
                              ? COLORS.accentDim
                              : COLORS.bg,
                          borderWidth: 1,
                          borderColor:
                            formEvento.servicio_especial === s.nombre
                              ? COLORS.accent + "88"
                              : COLORS.border,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              formEvento.servicio_especial === s.nombre
                                ? COLORS.accentLight
                                : COLORS.textPrimary,
                            fontSize: 14,
                            fontWeight: "600",
                          }}
                        >
                          {s.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            <Text
              style={{
                color: COLORS.textMuted,
                fontSize: 11,
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              DESCRIPCIÓN (opcional)
            </Text>
            <TextInput
              value={formEvento.descripcion}
              onChangeText={(v) =>
                setFormEvento((p) => ({ ...p, descripcion: v }))
              }
              placeholder="Ej: Cerrado por feriado nacional"
              placeholderTextColor={COLORS.textMuted}
              style={{
                backgroundColor: COLORS.bg,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 14,
                color: COLORS.textPrimary,
                fontSize: 15,
                marginBottom: 24,
              }}
            />

            <TouchableOpacity
              onPress={async () => {
                if (
                  formEvento.tipo === "servicio_especial" &&
                  !formEvento.servicio_especial.trim()
                ) {
                  Alert.alert("Atención", "Elegí un servicio de la lista.");
                  return;
                }
                const { data, error } = await supabase
                  .from("eventos_especiales")
                  .insert({
                    admin_id: userId,
                    fecha: fechaSeleccionada,
                    tipo: formEvento.tipo,
                    hora_inicio:
                      formEvento.tipo === "horario_especial"
                        ? formEvento.hora_inicio
                        : null,
                    hora_fin:
                      formEvento.tipo === "horario_especial"
                        ? formEvento.hora_fin
                        : null,
                    servicio_especial:
                      formEvento.tipo === "servicio_especial"
                        ? formEvento.servicio_especial
                        : null,
                    descripcion: formEvento.descripcion || null,
                  })
                  .select()
                  .single();

                if (!error && data) {
                  setEventoDelDia(data);
                  setModalEvento(false);
                } else {
                  Alert.alert(
                    "Error",
                    error?.message || "No se pudo guardar el evento.",
                  );
                }
              }}
              style={{
                backgroundColor: COLORS.accent,
                padding: 16,
                borderRadius: 14,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                Guardar evento
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalEvento(false)}
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
