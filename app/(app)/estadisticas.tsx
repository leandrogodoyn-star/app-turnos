import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

type Periodo = "semana" | "mes" | "trimestre";

type Reserva = {
    id: string;
    estado: string;
    servicio: string | null;
    fecha: string | null;
};

type ServicioInfo = {
    nombre: string;
    precio: number | null;
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getFechaDesde(periodo: Periodo): string {
    const d = new Date();
    if (periodo === "semana") d.setDate(d.getDate() - 7);
    else if (periodo === "mes") d.setMonth(d.getMonth() - 1);
    else d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
}

function StatCard({
    label,
    value,
    sub,
    color,
    bg,
}: {
    label: string;
    value: string;
    sub?: string;
    color: string;
    bg: string;
}) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: color + "44",
                alignItems: "center",
                gap: 4,
            }}
        >
            <Text style={{ color, fontSize: 26, fontWeight: "800" }}>{value}</Text>
            <Text
                style={{
                    color: color + "BB",
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    textAlign: "center",
                }}
            >
                {label.toUpperCase()}
            </Text>
            {sub ? (
                <Text style={{ color: COLORS.textMuted, fontSize: 11, textAlign: "center" }}>
                    {sub}
                </Text>
            ) : null}
        </View>
    );
}

export default function Estadisticas() {
    const [periodo, setPeriodo] = useState<Periodo>("mes");
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [serviciosMap, setServiciosMap] = useState<Record<string, ServicioInfo>>({});
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargar();
    }, [periodo]);

    const cargar = async () => {
        setCargando(true);
        try {
            const { data: auth } = await supabase.auth.getUser();
            const userId = auth?.user?.id;
            if (!userId) return;

            const fechaDesde = getFechaDesde(periodo);

            // Cargar reservas del período con fecha del horario
            const { data: reservasData } = await supabase
                .from("reservas")
                .select("id, estado, servicio, horarios(fecha)")
                .eq("admin_id", userId)
                .gte("horarios.fecha", fechaDesde);

            // Cargar servicios para obtener precios
            const { data: serviciosData } = await supabase
                .from("servicios")
                .select("nombre, precio")
                .eq("admin_id", userId);

            const mapa: Record<string, ServicioInfo> = {};
            (serviciosData || []).forEach((s) => {
                mapa[s.nombre] = { nombre: s.nombre, precio: s.precio };
            });

            const formateadas: Reserva[] = (reservasData || [])
                .filter((r: any) => r.horarios?.fecha >= fechaDesde)
                .map((r: any) => ({
                    id: r.id,
                    estado: r.estado,
                    servicio: r.servicio,
                    fecha: r.horarios?.fecha ?? null,
                }));

            setServiciosMap(mapa);
            setReservas(formateadas);
        } catch {
            // silencioso
        } finally {
            setCargando(false);
        }
    };

    // --- Métricas ---
    const total = reservas.length;
    const completados = reservas.filter((r) => r.estado === "completado").length;
    const pendientes = reservas.filter((r) => r.estado === "pendiente").length;
    const tasaCompletados =
        total > 0 ? Math.round((completados / total) * 100) : 0;

    // Ingresos estimados (solo servicios con precio, solo completados)
    let ingresos = 0;
    let hayPrecios = false;
    reservas
        .filter((r) => r.estado === "completado" && r.servicio)
        .forEach((r) => {
            const info = serviciosMap[r.servicio!];
            if (info?.precio != null) {
                ingresos += info.precio;
                hayPrecios = true;
            }
        });

    // Actividad por día de la semana (últimas N semanas)
    const porDia = [0, 0, 0, 0, 0, 0, 0];
    reservas.forEach((r) => {
        if (!r.fecha) return;
        const dia = new Date(r.fecha + "T12:00:00").getDay();
        porDia[dia]++;
    });
    const maxDia = Math.max(...porDia, 1);

    // Top servicios
    const conteoServicios: Record<string, number> = {};
    reservas.forEach((r) => {
        if (!r.servicio) return;
        conteoServicios[r.servicio] = (conteoServicios[r.servicio] || 0) + 1;
    });
    const topServicios = Object.entries(conteoServicios)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const periodos: { key: Periodo; label: string }[] = [
        { key: "semana", label: "7 días" },
        { key: "mes", label: "30 días" },
        { key: "trimestre", label: "3 meses" },
    ];

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
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        backgroundColor: COLORS.surface,
                        borderRadius: 10,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                    }}
                >
                    <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text
                        style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 1.5 }}
                    >
                        RESUMEN
                    </Text>
                    <Text
                        style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: "800" }}
                    >
                        Estadísticas
                    </Text>
                </View>
            </View>

            {cargando ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={COLORS.accent} size="large" />
                    <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 13 }}>
                        Cargando estadísticas...
                    </Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

                    {/* Selector de período */}
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                        {periodos.map((p) => (
                            <TouchableOpacity
                                key={p.key}
                                onPress={() => setPeriodo(p.key)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor:
                                        periodo === p.key ? COLORS.accent : COLORS.surface,
                                    borderWidth: 1,
                                    borderColor:
                                        periodo === p.key ? COLORS.accent : COLORS.border,
                                    alignItems: "center",
                                    shadowColor: periodo === p.key ? COLORS.accent : "transparent",
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 8,
                                    elevation: periodo === p.key ? 5 : 0,
                                }}
                            >
                                <Text
                                    style={{
                                        color: periodo === p.key ? "white" : COLORS.textMuted,
                                        fontSize: 13,
                                        fontWeight: "700",
                                    }}
                                >
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Cards fila 1 */}
                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                        <StatCard
                            label="Total turnos"
                            value={String(total)}
                            color={COLORS.accent}
                            bg={COLORS.accentDim}
                        />
                        <StatCard
                            label="Completados"
                            value={String(completados)}
                            sub={`${tasaCompletados}% del total`}
                            color={COLORS.success}
                            bg={COLORS.successDim}
                        />
                        <StatCard
                            label="Pendientes"
                            value={String(pendientes)}
                            color={COLORS.warning}
                            bg={COLORS.warningDim}
                        />
                    </View>

                    {/* Card ingresos */}
                    {hayPrecios && (
                        <View
                            style={{
                                backgroundColor: COLORS.surface,
                                borderRadius: 16,
                                padding: 20,
                                borderWidth: 1,
                                borderColor: COLORS.success + "44",
                                marginBottom: 24,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 14,
                            }}
                        >
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: COLORS.successDim,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>💰</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 1 }}>
                                    INGRESOS ESTIMADOS
                                </Text>
                                <Text
                                    style={{
                                        color: COLORS.success,
                                        fontSize: 28,
                                        fontWeight: "800",
                                        marginTop: 2,
                                    }}
                                >
                                    ${ingresos.toLocaleString("es-AR")}
                                </Text>
                                <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                                    Solo turnos completados con precio
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Gráfica actividad por día */}
                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 11,
                            letterSpacing: 1.5,
                            marginBottom: 14,
                        }}
                    >
                        ACTIVIDAD POR DÍA DE LA SEMANA
                    </Text>
                    <View
                        style={{
                            backgroundColor: COLORS.surface,
                            borderRadius: 16,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            marginBottom: 24,
                        }}
                    >
                        {total === 0 ? (
                            <Text
                                style={{
                                    color: COLORS.textMuted,
                                    textAlign: "center",
                                    fontSize: 13,
                                    paddingVertical: 12,
                                }}
                            >
                                Sin datos en este período
                            </Text>
                        ) : (
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "flex-end",
                                    justifyContent: "space-between",
                                    height: 100,
                                    gap: 6,
                                }}
                            >
                                {porDia.map((count, i) => {
                                    const altura = maxDia > 0 ? (count / maxDia) * 80 : 0;
                                    const esMax = count === maxDia && count > 0;
                                    return (
                                        <View
                                            key={i}
                                            style={{ flex: 1, alignItems: "center", gap: 8 }}
                                        >
                                            {count > 0 && (
                                                <Text
                                                    style={{
                                                        color: esMax ? COLORS.accent : COLORS.textMuted,
                                                        fontSize: 11,
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {count}
                                                </Text>
                                            )}
                                            <View
                                                style={{
                                                    width: "100%",
                                                    height: Math.max(altura, count > 0 ? 6 : 3),
                                                    borderRadius: 6,
                                                    backgroundColor: esMax
                                                        ? COLORS.accent
                                                        : count > 0
                                                            ? COLORS.accentDim
                                                            : COLORS.border,
                                                    borderWidth: esMax ? 0 : 1,
                                                    borderColor: esMax ? "transparent" : COLORS.border,
                                                }}
                                            />
                                            <Text
                                                style={{
                                                    color: esMax ? COLORS.accent : COLORS.textMuted,
                                                    fontSize: 10,
                                                    fontWeight: esMax ? "700" : "400",
                                                }}
                                            >
                                                {DIAS_SEMANA[i]}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Top servicios */}
                    <Text
                        style={{
                            color: COLORS.textMuted,
                            fontSize: 11,
                            letterSpacing: 1.5,
                            marginBottom: 14,
                        }}
                    >
                        TOP SERVICIOS
                    </Text>
                    <View
                        style={{
                            backgroundColor: COLORS.surface,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            overflow: "hidden",
                            marginBottom: 8,
                        }}
                    >
                        {topServicios.length === 0 ? (
                            <View style={{ padding: 24, alignItems: "center" }}>
                                <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                                    Sin servicios registrados en este período
                                </Text>
                            </View>
                        ) : (
                            topServicios.map(([nombre, cantidad], i) => {
                                const porcentaje =
                                    total > 0 ? Math.round((cantidad / total) * 100) : 0;
                                return (
                                    <View
                                        key={nombre}
                                        style={{
                                            padding: 16,
                                            borderBottomWidth: i < topServicios.length - 1 ? 1 : 0,
                                            borderBottomColor: COLORS.border,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                marginBottom: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: COLORS.textMuted,
                                                    fontSize: 12,
                                                    fontWeight: "800",
                                                    marginRight: 10,
                                                    width: 20,
                                                    textAlign: "center",
                                                }}
                                            >
                                                {i + 1}
                                            </Text>
                                            <Text
                                                style={{
                                                    color: COLORS.textPrimary,
                                                    fontSize: 14,
                                                    fontWeight: "600",
                                                    flex: 1,
                                                }}
                                            >
                                                {nombre}
                                            </Text>
                                            <Text
                                                style={{
                                                    color: COLORS.accent,
                                                    fontSize: 13,
                                                    fontWeight: "700",
                                                }}
                                            >
                                                {cantidad} turnos
                                            </Text>
                                        </View>
                                        {/* Barra de progreso */}
                                        <View
                                            style={{
                                                height: 4,
                                                backgroundColor: COLORS.border,
                                                borderRadius: 2,
                                                marginLeft: 30,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    height: 4,
                                                    width: `${porcentaje}%`,
                                                    backgroundColor: COLORS.accent,
                                                    borderRadius: 2,
                                                }}
                                            />
                                        </View>
                                        <Text
                                            style={{
                                                color: COLORS.textMuted,
                                                fontSize: 11,
                                                marginTop: 4,
                                                marginLeft: 30,
                                            }}
                                        >
                                            {porcentaje}% del total
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
