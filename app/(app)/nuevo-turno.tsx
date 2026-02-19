import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

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

function generarSlots(horaInicio: string, horaFin: string): string[] {
  const slots: string[] = [];
  const [hIni, mIni] = horaInicio.split(":").map(Number);
  const [hFin, mFin] = horaFin.split(":").map(Number);
  let mins = hIni * 60 + mIni;
  const finMins = hFin * 60 + mFin;
  while (mins < finMins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    mins += 30;
  }
  return slots;
}

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

export default function GestionarHorarios() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [horariosBloqueados, setHorariosBloqueados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Rango horario
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("19:00");
  const [modalRango, setModalRango] = useState(false);
  const [horaInicioTemp, setHoraInicioTemp] = useState("08:00");
  const [horaFinTemp, setHoraFinTemp] = useState("19:00");

  const dias = generarDias();
  const slots = generarSlots(horaInicio, horaFin);

  // Obtener userId al montar
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id);
    });
  }, []);

  // Cargar ocupados y bloqueados cuando cambia la fecha
  useEffect(() => {
    if (!fechaSeleccionada || !userId) return;
    const cargar = async () => {
      setCargando(true);

      // Turnos ya reservados por clientes
      const { data: ocupados } = await supabase
        .from("turnos")
        .select("hora")
        .eq("fecha", fechaSeleccionada)
        .neq("estado", "cancelado")
        .not("nombre_cliente", "is", null);

      // Horarios bloqueados por el dueño
      const { data: bloqueados } = await supabase
        .from("horarios_bloqueados")
        .select("hora")
        .eq("user_id", userId)
        .eq("fecha", fechaSeleccionada);

      setHorariosOcupados(ocupados?.map((t) => t.hora.slice(0, 5)) ?? []);
      setHorariosBloqueados(bloqueados?.map((b) => b.hora.slice(0, 5)) ?? []);
      setCargando(false);
    };
    cargar();
  }, [fechaSeleccionada, userId]);

  // Alternar bloqueo de un slot — guarda/elimina en Supabase al instante
  const toggleBloqueo = async (hora: string) => {
    if (!userId || !fechaSeleccionada) return;
    // No se puede bloquear un turno ya reservado
    if (horariosOcupados.includes(hora)) return;

    setGuardando(hora);
    const estaBloqueado = horariosBloqueados.includes(hora);

    if (estaBloqueado) {
      // Desbloquear → eliminar fila
      await supabase
        .from("horarios_bloqueados")
        .delete()
        .eq("user_id", userId)
        .eq("fecha", fechaSeleccionada)
        .eq("hora", hora);
      setHorariosBloqueados((prev) => prev.filter((h) => h !== hora));
    } else {
      // Bloquear → insertar fila
      await supabase
        .from("horarios_bloqueados")
        .insert({ user_id: userId, fecha: fechaSeleccionada, hora });
      setHorariosBloqueados((prev) => [...prev, hora]);
    }
    setGuardando(null);
  };

  const getSlotEstado = (slot: string) => {
    if (horariosOcupados.includes(slot)) return "ocupado";
    if (horariosBloqueados.includes(slot)) return "bloqueado";
    return "disponible";
  };

  const totalDisponibles = slots.filter(
    (s) => getSlotEstado(s) === "disponible",
  ).length;
  const totalBloqueados = slots.filter(
    (s) => getSlotEstado(s) === "bloqueado",
  ).length;
  const totalOcupados = slots.filter(
    (s) => getSlotEstado(s) === "ocupado",
  ).length;

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
        {/* Selector de fecha */}
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
        ) : (
          <>
            {/* Stats del día */}
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

            {/* Leyenda */}
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

            {/* Grid de slots */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {slots.map((slot) => {
                const estado = getSlotEstado(slot);
                const estaGuardando = guardando === slot;
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
                    key={slot}
                    disabled={esOcupado || estaGuardando}
                    onPress={() => toggleBloqueo(slot)}
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
                        {slot}
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
              Los turnos se generarán cada 30 minutos dentro de este rango.
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
              onPress={() => {
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
    </View>
  );
}
