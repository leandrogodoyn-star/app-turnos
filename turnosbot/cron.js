require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

const HORA_INICIO = "08:00";
const HORA_FIN = "19:00";
const DIAS_ADELANTE = 14;

function generarSlots(horaInicio, horaFin) {
  const slots = [];
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

async function generarHorarios() {
  console.log("🕐 Iniciando generación de horarios...");

  // Traer todos los admins
  const { data: admins, error: adminsError } = await supabase
    .from("profiles")
    .select("id, nombre");

  if (adminsError || !admins || admins.length === 0) {
    console.log("No se encontraron admins:", adminsError?.message);
    return;
  }

  console.log(`👥 ${admins.length} negocio(s) encontrado(s)`);

  const slots = generarSlots(HORA_INICIO, HORA_FIN);
  const hoy = new Date();

  for (const admin of admins) {
    console.log(`📅 Generando horarios para: ${admin.nombre}`);
    let creados = 0;

    for (let i = 0; i < DIAS_ADELANTE; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const fecha = `${yyyy}-${mm}-${dd}`;

      for (const hora of slots) {
        // Insertar solo si no existe (upsert con ignore en conflicto)
        const { error } = await supabase
          .from("horarios")
          .insert({ admin_id: admin.id, fecha, hora, disponible: true })
          .throwOnError();

        if (!error) creados++;
      }
    }

    console.log(`✅ ${creados} horarios creados para ${admin.nombre}`);
  }

  console.log("🎉 Generación completada");
}

generarHorarios()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error en cron:", err);
    process.exit(1);
  });
