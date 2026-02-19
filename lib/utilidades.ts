import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";

export const cambiarFoto = async (
  userId: string,
  setPerfil: (p: any) => void,
) => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const imageUri = result.assets?.[0]?.uri;
    if (!imageUri) return;

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: "base64",
    });

    const arrayBuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`perfil/${userId}.png`, arrayBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.log("Error subiendo imagen:", uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(`perfil/${userId}.png`);

    const publicUrl = data.publicUrl;
    const publicUrlConCache = `${publicUrl}?t=${Date.now()}`;

    // Guarda la URL limpia en la base de datos ✅
    await supabase
      .from("perfiles")
      .update({ avatar: publicUrl })
      .eq("id", userId);

    // Muestra la URL con timestamp para forzar recarga ✅
    setPerfil((prev: any) => ({ ...prev, avatar: publicUrlConCache }));

    const { error: updateError } = await supabase
      .from("perfiles")
      .update({ avatar: publicUrl })
      .eq("id", userId);

    if (updateError) {
      console.log("Error guardando URL:", updateError.message);
      return;
    }

    console.log("URL guardada:", publicUrl);
    setPerfil((prev: any) => ({ ...prev, avatar: publicUrl }));
    console.log("Foto subida correctamente ✅");
  } catch (err) {
    console.log("Error en cambiarFoto:", err);
  }
};
