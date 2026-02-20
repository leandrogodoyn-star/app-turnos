const twilioService = require("./twilio.service");
const db = require("../config/supabase");

// Sesiones en memoria
const sesiones = {};

exports.processMessage = async (from, text) => {
  const sesion = sesiones[from] || { paso: "inicio" };

  if (text === "cancelar" || text === "salir" || text === "reiniciar") {
    delete sesiones[from];
    return twilioService.send(
      from,
      "🔄 Conversación reiniciada. Escribí el código de tu negocio para empezar.",
    );
  }

  switch (sesion.paso) {
    case "inicio": {
      if (!text.startsWith("#")) {
        return twilioService.send(
          from,
          "👋 ¡Hola! Bienvenido al sistema de turnos.\n\n" +
            "Para comenzar, escribí el *código de tu negocio*.\n" +
            "Ejemplo: *#lopez123*\n\n" +
            "Si no lo tenés, pedíselo al negocio.",
        );
      }

      const codigo = text.slice(1).trim();
      const { data: negocio } = await db
        .from("profiles")
        .select("id, nombre")
        .eq("codigo_bot", codigo)
        .single();

      if (!negocio) {
        return twilioService.send(
          from,
          "❌ Código de negocio no encontrado.\n" +
            "Verificá que esté bien escrito e intentá de nuevo.",
        );
      }

      sesiones[from] = {
        paso: "pedir_nombre",
        negocioId: negocio.id,
        negocioNombre: negocio.nombre,
      };
      return twilioService.send(
        from,
        `✅ Conectado con *${negocio.nombre}*.\n\n¿Cuál es tu nombre completo?`,
      );
    }

    case "pedir_nombre": {
      sesiones[from] = { ...sesion, paso: "pedir_fecha", nombre: text };

      const fechas = await obtenerFechasDisponibles(sesion.negocioId);
      if (fechas.length === 0) {
        delete sesiones[from];
        return twilioService.send(
          from,
          "😕 No hay turnos disponibles por el momento. Intentá más tarde.",
        );
      }

      const lista = fechas
        .map((f, i) => `${i + 1}. ${formatearFecha(f)}`)
        .join("\n");
      sesiones[from] = { ...sesiones[from], fechasDisponibles: fechas };
      return twilioService.send(
        from,
        `Hola *${text}*! 😊\n\n¿Qué día preferís?\n\n${lista}\n\nRespondé con el *número* de la opción.`,
      );
    }

    case "pedir_fecha": {
      const idx = parseInt(text) - 1;
      const fechas = sesion.fechasDisponibles || [];

      if (isNaN(idx) || idx < 0 || idx >= fechas.length) {
        return twilioService.send(
          from,
          `Por favor respondé con un número del 1 al ${fechas.length}.`,
        );
      }

      const fechaElegida = fechas[idx];
      const horarios = await obtenerHorariosDisponibles(
        sesion.negocioId,
        fechaElegida,
      );

      if (horarios.length === 0) {
        const lista = sesion.fechasDisponibles
          .map((f, i) => `${i + 1}. ${formatearFecha(f)}`)
          .join("\n");
        return twilioService.send(
          from,
          `😕 No quedan horarios para ese día. Elegí otro.\n\n${lista}`,
        );
      }

      const lista = horarios.map((h, i) => `${i + 1}. ${h}`).join("\n");
      sesiones[from] = {
        ...sesion,
        paso: "pedir_hora",
        fecha: fechaElegida,
        horariosDisponibles: horarios,
      };
      return twilioService.send(
        from,
        `📅 *${formatearFecha(fechaElegida)}*\n\nHorarios disponibles:\n\n${lista}\n\nRespondé con el *número* del horario.`,
      );
    }

    case "pedir_hora": {
      const idx = parseInt(text) - 1;
      const horarios = sesion.horariosDisponibles || [];

      if (isNaN(idx) || idx < 0 || idx >= horarios.length) {
        return twilioService.send(
          from,
          `Por favor respondé con un número del 1 al ${horarios.length}.`,
        );
      }

      const horaElegida = horarios[idx];
      sesiones[from] = { ...sesion, paso: "pedir_servicio", hora: horaElegida };
      return twilioService.send(
        from,
        `🕐 Horario elegido: *${horaElegida}*\n\n¿Qué servicio necesitás?\nEjemplo: corte, color, mechas, etc.`,
      );
    }

    case "pedir_servicio": {
      sesiones[from] = { ...sesion, paso: "confirmar", servicio: text };
      const s = sesiones[from];
      return twilioService.send(
        from,
        "📋 *Resumen de tu turno:*\n\n" +
          `👤 Nombre: ${s.nombre}\n` +
          `📅 Fecha: ${formatearFecha(s.fecha)}\n` +
          `🕐 Hora: ${s.hora}\n` +
          `✂️ Servicio: ${s.servicio}\n\n` +
          "¿Confirmás el turno?\n*1. Sí, confirmar*\n*2. No, cancelar*",
      );
    }

    case "confirmar": {
      if (text === "1" || text === "si" || text === "sí") {
        const s = sesiones[from];

        const disponible = await verificarDisponibilidad(
          s.negocioId,
          s.fecha,
          s.hora,
        );
        if (!disponible) {
          delete sesiones[from];
          return twilioService.send(
            from,
            "😕 Lo sentimos, ese horario acaba de ser tomado.\nEscribí *reiniciar* para elegir otro.",
          );
        }

        const telefono = from.replace("whatsapp:", "");

        const { data: horario } = await db
          .from("horarios")
          .select("id")
          .eq("admin_id", s.negocioId)
          .eq("fecha", s.fecha)
          .eq("hora", s.hora)
          .single();

        if (!horario) {
          delete sesiones[from];
          return twilioService.send(
            from,
            "❌ No se encontró el horario. Intentá de nuevo.",
          );
        }

        const { error } = await db.from("reservas").insert({
          admin_id: s.negocioId,
          horario_id: horario.id,
          cliente_nombre: s.nombre,
          cliente_telefono: telefono,
        });

        if (error) {
          delete sesiones[from];
          return twilioService.send(
            from,
            "❌ Hubo un error al crear el turno. Intentá de nuevo.",
          );
        }

        delete sesiones[from];
        return twilioService.send(
          from,
          `✅ *¡Turno confirmado!*\n\n` +
            `📅 ${formatearFecha(s.fecha)} a las ${s.hora}\n` +
            `✂️ ${s.servicio}\n\n` +
            "Te esperamos 🙌\n\n_Si necesitás cancelar, contactá directamente al negocio._",
        );
      } else if (text === "2" || text === "no") {
        delete sesiones[from];
        return twilioService.send(
          from,
          "👌 Turno cancelado. Escribí el código del negocio cuando quieras intentar de nuevo.",
        );
      } else {
        return twilioService.send(
          from,
          "Respondé *1* para confirmar o *2* para cancelar.",
        );
      }
    }

    default: {
      delete sesiones[from];
      return twilioService.send(
        from,
        "Escribí el código del negocio para empezar. Ejemplo: *#lopez123*",
      );
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function obtenerFechasDisponibles(negocioId) {
  const hoy = new Date();
  const disponibles = [];

  for (let i = 0; i < 14; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const fecha = d.toISOString().split("T")[0];
    const horarios = await obtenerHorariosDisponibles(negocioId, fecha);
    if (horarios.length > 0) disponibles.push(fecha);
    if (disponibles.length >= 5) break;
  }

  return disponibles;
}

async function obtenerHorariosDisponibles(negocioId, fecha) {
  const { data: horarios } = await db
    .from("horarios")
    .select("id, hora")
    .eq("admin_id", negocioId)
    .eq("fecha", fecha)
    .eq("disponible", true);

  if (!horarios || horarios.length === 0) return [];

  const { data: reservados } = await db
    .from("reservas")
    .select("horario_id")
    .in(
      "horario_id",
      horarios.map((h) => h.id),
    );

  const reservadosSet = new Set(reservados?.map((r) => r.horario_id) ?? []);

  return horarios
    .filter((h) => !reservadosSet.has(h.id))
    .map((h) => h.hora.slice(0, 5))
    .sort();
}

async function verificarDisponibilidad(negocioId, fecha, hora) {
  const { data: horario } = await db
    .from("horarios")
    .select("id")
    .eq("admin_id", negocioId)
    .eq("fecha", fecha)
    .eq("hora", hora)
    .eq("disponible", true)
    .single();

  if (!horario) return false;

  const { data: reservado } = await db
    .from("reservas")
    .select("id")
    .eq("horario_id", horario.id)
    .single();

  return !reservado;
}

function formatearFecha(fecha) {
  const [yyyy, mm, dd] = fecha.split("-");
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
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  return `${diasSemana[d.getDay()]} ${dd} de ${meses[parseInt(mm) - 1]}`;
}
