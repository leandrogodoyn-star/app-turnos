require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

// ─── Verificación del webhook (Meta lo llama una sola vez) ───────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verificado");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Token inválido");
  }
});

// ─── Recibir mensajes ────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Siempre responder 200 rápido a Meta

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return;

    const from = message.from; // número del cliente
    const text = message.text?.body?.trim().toLowerCase();
    if (!text) return;

    console.log(`📩 Mensaje de ${from}: ${text}`);

    await procesarMensaje(from, text);
  } catch (err) {
    console.error("Error procesando mensaje:", err);
  }
});

// ─── Estados de conversación (en memoria) ───────────────────────────────────
// { [numeroCliente]: { paso, negocioId, negocioNombre, fecha, hora, nombre } }
const sesiones = {};

// ─── Lógica del bot ──────────────────────────────────────────────────────────
async function procesarMensaje(from, text) {
  const sesion = sesiones[from] || { paso: "inicio" };

  // Comando para reiniciar en cualquier momento
  if (text === "cancelar" || text === "salir" || text === "reiniciar") {
    delete sesiones[from];
    await enviarMensaje(
      from,
      "🔄 Conversación reiniciada. Escribí el código de tu negocio para empezar.",
    );
    return;
  }

  switch (sesion.paso) {
    case "inicio": {
      // El cliente escribe el código del negocio (ej: #lopez123)
      if (!text.startsWith("#")) {
        await enviarMensaje(
          from,
          "👋 ¡Hola! Bienvenido al sistema de turnos.\n\n" +
            "Para comenzar, escribí el *código de tu negocio*.\n" +
            "Ejemplo: *#lopez123*\n\n" +
            "Si no lo tenés, pedíselo al negocio.",
        );
        return;
      }

      const codigo = text.slice(1); // sacar el #
      const { data: negocio } = await supabase
        .from("perfiles")
        .select("id, nombre")
        .eq("codigo_bot", codigo)
        .single();

      if (!negocio) {
        await enviarMensaje(
          from,
          "❌ Código de negocio no encontrado.\n" +
            "Verificá que esté bien escrito e intentá de nuevo.",
        );
        return;
      }

      sesiones[from] = {
        paso: "pedir_nombre",
        negocioId: negocio.id,
        negocioNombre: negocio.nombre,
      };
      await enviarMensaje(
        from,
        `✅ Conectado con *${negocio.nombre}*.\n\n` +
          "¿Cuál es tu nombre completo?",
      );
      break;
    }

    case "pedir_nombre": {
      sesiones[from] = { ...sesion, paso: "pedir_fecha", nombre: text };

      // Traer próximas fechas con horarios disponibles
      const fechas = await obtenerFechasDisponibles(sesion.negocioId);
      if (fechas.length === 0) {
        await enviarMensaje(
          from,
          "😕 No hay turnos disponibles por el momento. Intentá más tarde.",
        );
        delete sesiones[from];
        return;
      }

      const lista = fechas
        .map((f, i) => `${i + 1}. ${formatearFecha(f)}`)
        .join("\n");
      sesiones[from] = { ...sesiones[from], fechasDisponibles: fechas };
      await enviarMensaje(
        from,
        `Hola *${text}*! 😊\n\n` +
          "¿Qué día preferís?\n\n" +
          lista +
          "\n\nRespondé con el *número* de la opción.",
      );
      break;
    }

    case "pedir_fecha": {
      const idx = parseInt(text) - 1;
      const fechas = sesion.fechasDisponibles || [];

      if (isNaN(idx) || idx < 0 || idx >= fechas.length) {
        await enviarMensaje(
          from,
          `Por favor respondé con un número del 1 al ${fechas.length}.`,
        );
        return;
      }

      const fechaElegida = fechas[idx];
      const horarios = await obtenerHorariosDisponibles(
        sesion.negocioId,
        fechaElegida,
      );

      if (horarios.length === 0) {
        await enviarMensaje(
          from,
          "😕 No quedan horarios para ese día. Elegí otro.\n\n" +
            sesion.fechasDisponibles
              .map((f, i) => `${i + 1}. ${formatearFecha(f)}`)
              .join("\n"),
        );
        return;
      }

      const lista = horarios.map((h, i) => `${i + 1}. ${h}`).join("\n");
      sesiones[from] = {
        ...sesion,
        paso: "pedir_hora",
        fecha: fechaElegida,
        horariosDisponibles: horarios,
      };
      await enviarMensaje(
        from,
        `📅 *${formatearFecha(fechaElegida)}*\n\n` +
          "Horarios disponibles:\n\n" +
          lista +
          "\n\nRespondé con el *número* del horario.",
      );
      break;
    }

    case "pedir_hora": {
      const idx = parseInt(text) - 1;
      const horarios = sesion.horariosDisponibles || [];

      if (isNaN(idx) || idx < 0 || idx >= horarios.length) {
        await enviarMensaje(
          from,
          `Por favor respondé con un número del 1 al ${horarios.length}.`,
        );
        return;
      }

      const horaElegida = horarios[idx];
      sesiones[from] = { ...sesion, paso: "pedir_servicio", hora: horaElegida };
      await enviarMensaje(
        from,
        `🕐 Horario elegido: *${horaElegida}*\n\n` +
          "¿Qué servicio necesitás?\n" +
          "Ejemplo: corte, color, mechas, etc.",
      );
      break;
    }

    case "pedir_servicio": {
      sesiones[from] = { ...sesion, paso: "confirmar", servicio: text };
      const s = sesiones[from];
      await enviarMensaje(
        from,
        "📋 *Resumen de tu turno:*\n\n" +
          `👤 Nombre: ${s.nombre}\n` +
          `📅 Fecha: ${formatearFecha(s.fecha)}\n` +
          `🕐 Hora: ${s.hora}\n` +
          `✂️ Servicio: ${s.servicio}\n\n` +
          "¿Confirmás el turno?\n*1. Sí, confirmar*\n*2. No, cancelar*",
      );
      break;
    }

    case "confirmar": {
      if (text === "1" || text === "si" || text === "sí") {
        const s = sesiones[from];

        // Verificar que el horario siga disponible
        const disponible = await verificarDisponibilidad(
          s.negocioId,
          s.fecha,
          s.hora,
        );
        if (!disponible) {
          await enviarMensaje(
            from,
            "😕 Lo sentimos, ese horario acaba de ser tomado.\n" +
              "Escribí *reiniciar* para elegir otro.",
          );
          delete sesiones[from];
          return;
        }

        // Crear el turno en Supabase
        const { error } = await supabase.from("turnos").insert({
          user_id: s.negocioId,
          fecha: s.fecha,
          hora: s.hora,
          estado: "pendiente",
          nombre_cliente: s.nombre,
          telefono: from,
          servicio: s.servicio,
        });

        if (error) {
          await enviarMensaje(
            from,
            "❌ Hubo un error al crear el turno. Intentá de nuevo.",
          );
          delete sesiones[from];
          return;
        }

        await enviarMensaje(
          from,
          `✅ *¡Turno confirmado!*\n\n` +
            `📅 ${formatearFecha(s.fecha)} a las ${s.hora}\n` +
            `✂️ ${s.servicio}\n\n` +
            "Te esperamos 🙌\n\n" +
            "_Si necesitás cancelar, contactá directamente al negocio._",
        );
        delete sesiones[from];
      } else if (text === "2" || text === "no") {
        delete sesiones[from];
        await enviarMensaje(
          from,
          "👌 Turno cancelado. Escribí el código del negocio cuando quieras intentar de nuevo.",
        );
      } else {
        await enviarMensaje(
          from,
          "Respondé *1* para confirmar o *2* para cancelar.",
        );
      }
      break;
    }

    default: {
      delete sesiones[from];
      await enviarMensaje(
        from,
        "Escribí el código del negocio para empezar. Ejemplo: *#lopez123*",
      );
    }
  }
}

// ─── Helpers Supabase ────────────────────────────────────────────────────────

async function obtenerFechasDisponibles(negocioId) {
  const hoy = new Date();
  const fechas = [];

  for (let i = 0; i < 14; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    fechas.push(`${yyyy}-${mm}-${dd}`);
  }

  // Filtrar solo fechas que tengan al menos un horario disponible
  const disponibles = [];
  for (const fecha of fechas) {
    const horarios = await obtenerHorariosDisponibles(negocioId, fecha);
    if (horarios.length > 0) disponibles.push(fecha);
    if (disponibles.length >= 5) break; // máximo 5 fechas
  }

  return disponibles;
}

async function obtenerHorariosDisponibles(negocioId, fecha) {
  // Generar todos los slots de 8:00 a 19:00
  const todosLosSlots = generarSlots("08:00", "19:00");

  // Traer bloqueados por el dueño
  const { data: bloqueados } = await supabase
    .from("horarios_bloqueados")
    .select("hora")
    .eq("user_id", negocioId)
    .eq("fecha", fecha);

  // Traer ocupados por turnos existentes
  const { data: ocupados } = await supabase
    .from("turnos")
    .select("hora")
    .eq("user_id", negocioId)
    .eq("fecha", fecha)
    .neq("estado", "cancelado");

  const bloqueadosSet = new Set(
    bloqueados?.map((b) => b.hora.slice(0, 5)) ?? [],
  );
  const ocupadosSet = new Set(ocupados?.map((t) => t.hora.slice(0, 5)) ?? []);

  return todosLosSlots.filter(
    (slot) => !bloqueadosSet.has(slot) && !ocupadosSet.has(slot),
  );
}

async function verificarDisponibilidad(negocioId, fecha, hora) {
  const { data: bloqueado } = await supabase
    .from("horarios_bloqueados")
    .select("id")
    .eq("user_id", negocioId)
    .eq("fecha", fecha)
    .eq("hora", hora)
    .single();

  if (bloqueado) return false;

  const { data: ocupado } = await supabase
    .from("turnos")
    .select("id")
    .eq("user_id", negocioId)
    .eq("fecha", fecha)
    .eq("hora", hora)
    .neq("estado", "cancelado")
    .single();

  return !ocupado;
}

// ─── Helpers generales ───────────────────────────────────────────────────────

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

async function enviarMensaje(to, mensaje) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: mensaje },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error(
      "Error enviando mensaje:",
      err?.response?.data || err.message,
    );
  }
}

// ─── Iniciar servidor ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
