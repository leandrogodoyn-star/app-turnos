const db = require("../config/supabase");
const botService = require("../services/bot.service");
const logger = require("../config/logger");

exports.handleIncoming = async (req, res) => {
  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");

  try {
    const from = req.body?.From?.replace(/\s/g, "");
    const text = req.body?.Body?.trim().toLowerCase();
    if (!from || !text) return;

    await botService.processMessage(from, text);
  } catch (err) {
    logger.error(err);
  }
};

exports.handleMercadoPago = async (req, res) => {
  const { action, type, data } = req.body;

  console.log("MP Webhook recibido:", JSON.stringify(req.body));

  // Responder rápido a MP
  res.status(200).send("OK");

  try {
    // Solo nos interesan las suscripciones (preapproval) aprobadas
    if (type === "subscription_preapproval" || type === "preapproval") {
      const id = data?.id;

      // Consultar detalle a MP
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });

      if (!mpRes.ok) throw new Error("Error consultando preapproval en MP");

      const preapproval = await mpRes.json();

      // Si está autorizado, activamos premium
      if (preapproval.status === "authorized") {
        const userId = preapproval.external_reference;
        console.log(`Activando Premium para usuario: ${userId}`);

        if (userId) {
          const { error } = await db
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", userId);

          if (error) console.error("Error actualizando Supabase:", error);
          else console.log("Usuario actualizado a Premium correctamente.");
        }
      }
    }
  } catch (err) {
    console.error("Error procesando Webhook MP:", err);
  }
};
