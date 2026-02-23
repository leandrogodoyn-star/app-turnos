const cron = require("node-cron");
const db = require("../config/supabase");

async function generarHorariosParaNegocio(negocio) {
  const duracion = negocio.duracion_turno || 30;
  const horaApertura = negocio.hora_apertura?.slice(0, 5) || "09:00";
  const horaCierre = negocio.hora_cierre?.slice(0, 5) || "18:00";
  const diasTrabajo = negocio.dias_trabajo?.map(Number) || [1, 2, 3, 4, 5];

  const [hIni, mIni] = horaApertura.split(":").map(Number);
  const [hFin, mFin] = horaCierre.split(":").map(Number);
  const inicioMins = hIni * 60 + mIni;
  const finMins = hFin * 60 + mFin;

  // Generar para los próximos 14 días
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);

    // Respetar días de trabajo
    if (!diasTrabajo.includes(d.getDay())) continue;

    const fecha = d.toISOString().split("T")[0];

    // Verificar si ya tiene horarios ese día
    const { data: existentes } = await db
      .from("horarios")
      .select("id")
      .eq("admin_id", negocio.id)
      .eq("fecha", fecha)
      .limit(1);

    if (existentes && existentes.length > 0) continue;

    // Verificar si es feriado o evento especial
    const { data: evento } = await db
      .from("eventos_especiales")
      .select("tipo, hora_inicio, hora_fin")
      .eq("admin_id", negocio.id)
      .eq("fecha", fecha)
      .single();

    if (evento?.tipo === "feriado") continue;

    // Si tiene horario especial, usarlo
    let inicio = inicioMins;
    let fin = finMins;
    if (evento?.tipo === "horario_especial") {
      const [hEI, mEI] = evento.hora_inicio.slice(0, 5).split(":").map(Number);
      const [hEF, mEF] = evento.hora_fin.slice(0, 5).split(":").map(Number);
      inicio = hEI * 60 + mEI;
      fin = hEF * 60 + mEF;
    }

    // Generar slots según duración
    const slots = [];
    for (let mins = inicio; mins < fin; mins += duracion) {
      const hh = String(Math.floor(mins / 60)).padStart(2, "0");
      const mm = String(mins % 60).padStart(2, "0");
      slots.push({
        admin_id: negocio.id,
        fecha,
        hora: `${hh}:${mm}:00`,
        disponible: true,
      });
    }

    if (slots.length > 0) {
      await db.from("horarios").insert(slots);
    }
  }
}

async function generarTodosLosHorarios() {
  const { data: negocios, error } = await db
    .from("profiles")
    .select("id, duracion_turno, hora_apertura, hora_cierre, dias_trabajo")
    .not("codigo_bot", "is", null);

  console.log("Negocios encontrados:", negocios?.length, "Error:", error);
  console.log("Detalle:", JSON.stringify(negocios));

  if (!negocios) return;

  for (const negocio of negocios) {
    console.log(
      `Generando para negocio ${negocio.id}, duración: ${negocio.duracion_turno}`,
    );
    await generarHorariosParaNegocio(negocio);
  }
}

function iniciarCron() {
  // Ejecutar todos los días a las 00:01
  cron.schedule("1 0 * * *", async () => {
    console.log("Generando horarios automáticos...");
    await generarTodosLosHorarios();
    console.log("Horarios generados.");
  });

  // También ejecutar al iniciar el servidor para cubrir días faltantes
  generarTodosLosHorarios();
}

module.exports = { iniciarCron, generarTodosLosHorarios };
