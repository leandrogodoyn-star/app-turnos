import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";
import { Alert } from "react-native";

export const cambiarFoto = async (
  userId: string,
  setPerfil: (p: any) => void,
) => {
  try {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tus fotos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;

    // ✅ FIX REAL RN → usar arrayBuffer en vez de blob
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const fileName = `${userId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const publicUrl = data.publicUrl;

    await supabase
      .from("profiles")
      .update({ avatar: publicUrl })
      .eq("id", userId);

    setPerfil((prev: any) => ({
      ...prev,
      avatar: publicUrl + "?t=" + Date.now(),
    }));

    Alert.alert("Listo", "Foto actualizada");
  } catch (err: any) {
    console.log("Error subiendo imagen:", err);
    Alert.alert("Error", err.message ?? "No se pudo subir la imagen");
  }
};
