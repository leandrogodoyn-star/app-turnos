import { View, Text, TouchableOpacity } from "react-native";
import { supabase } from "../../lib/supabase";
import { router } from "expo-router";

export default function Configuracion() {
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#f4f6f8" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Configuración
      </Text>

      <TouchableOpacity
        onPress={cerrarSesion}
        style={{
          backgroundColor: "#ef4444",
          padding: 14,
          borderRadius: 8,
        }}
      >
        <Text
          style={{ color: "white", textAlign: "center", fontWeight: "600" }}
        >
          Cerrar Sesión
        </Text>
      </TouchableOpacity>
    </View>
  );
}
