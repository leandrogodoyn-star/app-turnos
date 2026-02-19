// app/(app)/configuracion.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

type Perfil = {
  nombre: string;
  correo: string;
  horario?: string;
};

export default function Configuracion() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [nuevoHorario, setNuevoHorario] = useState("");

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    const { data } = await supabase.from("perfiles").select("*").single();
    if (data) {
      setPerfil({
        nombre: data.nombre,
        correo: data.correo,
        horario: data.horario,
      });
      setNuevoNombre(data.nombre);
      setNuevoCorreo(data.correo);
      setNuevoHorario(data.horario || "");
    }
  };

  const guardarCambios = async () => {
    if (!perfil) return;
    const { error } = await supabase
      .from("perfiles")
      .update({
        nombre: nuevoNombre,
        correo: nuevoCorreo,
        horario: nuevoHorario,
      })
      .eq("nombre", perfil.nombre);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Guardado", "Los cambios se guardaron correctamente.");
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración del negocio</Text>

      <Text style={styles.label}>Nombre del negocio</Text>
      <TextInput
        value={nuevoNombre}
        onChangeText={setNuevoNombre}
        style={styles.input}
      />

      <Text style={styles.label}>Correo de contacto</Text>
      <TextInput
        value={nuevoCorreo}
        onChangeText={setNuevoCorreo}
        style={styles.input}
        keyboardType="email-address"
      />

      <Text style={styles.label}>Horario de atención</Text>
      <TextInput
        value={nuevoHorario}
        onChangeText={setNuevoHorario}
        style={styles.input}
        placeholder="Ej: Lun a Vie 9:00-18:00"
      />

      <TouchableOpacity onPress={guardarCambios} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Guardar cambios</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f4f6f8" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  label: { marginTop: 10, marginBottom: 5, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 8,
  },
  saveButtonText: { color: "white", fontWeight: "600", textAlign: "center" },
});
