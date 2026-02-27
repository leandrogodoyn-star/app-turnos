import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Paywall from "../../components/Paywall";
import { COLORS } from "../../constants/colors";
import { supabase } from "../../lib/supabase";

type Profesional = {
    id: string;
    nombre: string;
    especialidad: string;
    activo: boolean;
};

export default function Profesionales() {
    const [cargando, setCargando] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const [profesionales, setProfesionales] = useState<Profesional[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);

    const [formNombre, setFormNombre] = useState("");
    const [formEspecialidad, setFormEspecialidad] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        verificarEstado();
    }, []);

    const verificarEstado = async () => {
        const { data } = await supabase.auth.getUser();
        const id = data?.user?.id;
        if (!id) {
            setCargando(false);
            return;
        }
        setUserId(id);

        // Seleccionar todo para evitar errores si falta la columna 'tipo'
        const { data: perfil, error: perfilError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", id)
            .single();

        if (perfilError) {
            console.error("[Profesionales] Error fetching profile:", perfilError);
        }

        // Si estamos en esta pantalla dentro de (app), asumimos que es el dueño
        // Solo bloqueamos si el perfil dice explícitamente que no es admin
        const esAdmin = perfil ? (perfil.tipo === "admin" || !perfil.tipo) : true;

        setIsAdmin(esAdmin);
        setIsPremium(perfil?.is_premium || false);

        if (esAdmin && perfil?.is_premium) {
            cargarProfesionales(id);
        } else {
            setCargando(false);
        }
    };

    const cargarProfesionales = async (adminId: string) => {
        const { data, error } = await supabase
            .from("profesionales")
            .select("*")
            .eq("admin_id", adminId)
            .order("nombre", { ascending: true });

        if (!error && data) {
            setProfesionales(data);
        }
        setCargando(false);
    };

    const abrirModal = (prof?: Profesional) => {
        if (prof) {
            setEditandoId(prof.id);
            setFormNombre(prof.nombre);
            setFormEspecialidad(prof.especialidad || "");
        } else {
            setEditandoId(null);
            setFormNombre("");
            setFormEspecialidad("");
        }
        setModalVisible(true);
    };

    const guardarProfesional = async () => {
        if (!formNombre.trim()) {
            Alert.alert("Atención", "El nombre es obligatorio");
            return;
        }

        setGuardando(true);

        if (editandoId) {
            const { error } = await supabase
                .from("profesionales")
                .update({
                    nombre: formNombre.trim(),
                    especialidad: formEspecialidad.trim() || null,
                })
                .eq("id", editandoId)
                .eq("admin_id", userId);

            if (!error) {
                setProfesionales((prev) =>
                    prev.map((p) =>
                        p.id === editandoId
                            ? { ...p, nombre: formNombre.trim(), especialidad: formEspecialidad.trim() }
                            : p
                    )
                );
                setModalVisible(false);
            } else {
                Alert.alert("Error", "No se pudo actualizar: " + error.message);
            }
        } else {
            const { data, error } = await supabase
                .from("profesionales")
                .insert({
                    admin_id: userId,
                    nombre: formNombre.trim(),
                    especialidad: formEspecialidad.trim() || null,
                    activo: true,
                })
                .select()
                .single();

            if (!error && data) {
                setProfesionales((prev) => [...prev, data]);
                setModalVisible(false);
            } else {
                Alert.alert("Error", "No se pudo guardar: " + error?.message);
            }
        }
        setGuardando(false);
    };

    const toggleEstado = async (id: string, activoActual: boolean) => {
        const { error } = await supabase
            .from("profesionales")
            .update({ activo: !activoActual })
            .eq("id", id)
            .eq("admin_id", userId);

        if (!error) {
            setProfesionales((prev) =>
                prev.map((p) => (p.id === id ? { ...p, activo: !activoActual } : p))
            );
        }
    };

    const confirmarEliminar = (id: string, nombre: string) => {
        Alert.alert(
            "Eliminar profesional",
            `¿Estás seguro de que querés eliminar a ${nombre}? Esta acción no se puede deshacer.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase.from("profesionales").delete().eq("id", id).eq("admin_id", userId);
                        if (!error) {
                            setProfesionales(prev => prev.filter(p => p.id !== id));
                        } else {
                            Alert.alert("Error", "No se pudo eliminar el profesional");
                        }
                    }
                }
            ]
        );
    };

    if (cargando) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    if (!isAdmin) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: COLORS.textPrimary }}>Acceso denegado</Text>
            </View>
        );
    }

    if (!isPremium) {
        return (
            <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                {/* Header simple para volver */}
                <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: COLORS.surface, borderRadius: 10, alignSelf: "flex-start", padding: 10, borderWidth: 1, borderColor: COLORS.border }}>
                        <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>←</Text>
                    </TouchableOpacity>
                </View>
                <Paywall
                    title="Múltiples Profesionales"
                    description="Aumenta tu capacidad de atención. Gestioná los horarios de tus empleados y permití que tus clientes elijan con quién atenderse al reservar turnos."
                />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            {/* Header */}
            <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginRight: 14, borderWidth: 1, borderColor: COLORS.border }}>
                    <Text style={{ color: COLORS.textPrimary, fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 1.5 }}>EQUIPO</Text>
                    <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: "800" }}>Profesionales</Text>
                </View>
                <TouchableOpacity onPress={() => abrirModal()} style={{ backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>+ Nuevo</Text>
                </TouchableOpacity>
            </View>

            {/* Lista */}
            <FlatList
                data={profesionales}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
                ListEmptyComponent={
                    <View style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
                        <Text style={{ fontSize: 40, marginBottom: 16 }}>👩‍⚕️</Text>
                        <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Aún no tenés equipo</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: "center" }}>Agregá a los profesionales que trabajan con vos para asignarles turnos.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={{ backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center" }}>
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accentDim, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                            <Text style={{ fontSize: 20, color: COLORS.accentLight, fontWeight: "700" }}>{item.nombre.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" }}>{item.nombre}</Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>{item.especialidad || "Sin especialidad"}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <TouchableOpacity onPress={() => toggleEstado(item.id, item.activo)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: item.activo ? COLORS.successDim : COLORS.dangerDim, borderWidth: 1, borderColor: item.activo ? COLORS.success + "55" : COLORS.danger + "55" }}>
                                <Text style={{ color: item.activo ? COLORS.success : COLORS.danger, fontSize: 11, fontWeight: "700" }}>{item.activo ? "ACTIVO" : "INACTIVO"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => abrirModal(item)} style={{ padding: 8 }}>
                                <Text style={{ color: COLORS.accentLight }}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmarEliminar(item.id, item.nombre)} style={{ padding: 8 }}>
                                <Text style={{ color: COLORS.danger }}>🗑</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* Modal Crear/Editar */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: "#000000AA", justifyContent: "flex-end" }}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                        <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                                <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: "800" }}>
                                    {editandoId ? "Editar Profesional" : "Nuevo Profesional"}
                                </Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text style={{ color: COLORS.textMuted, fontSize: 24 }}>×</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>Nombre</Text>
                            <TextInput
                                value={formNombre}
                                onChangeText={setFormNombre}
                                placeholder="Ej: Laura"
                                placeholderTextColor={COLORS.textMuted}
                                style={{ backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, color: COLORS.textPrimary, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}
                            />

                            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>Especialidad (opcional)</Text>
                            <TextInput
                                value={formEspecialidad}
                                onChangeText={setFormEspecialidad}
                                placeholder="Ej: Manicura"
                                placeholderTextColor={COLORS.textMuted}
                                style={{ backgroundColor: COLORS.bg, borderRadius: 12, padding: 16, color: COLORS.textPrimary, fontSize: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border }}
                            />

                            <TouchableOpacity
                                disabled={guardando}
                                onPress={guardarProfesional}
                                style={{ backgroundColor: COLORS.accent, borderRadius: 14, padding: 16, alignItems: "center", opacity: guardando ? 0.7 : 1 }}
                            >
                                {guardando ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Guardar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}
