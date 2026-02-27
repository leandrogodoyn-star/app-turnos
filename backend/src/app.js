const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const webhookRoutes = require("./routes/webhook.routes");

const app = express();

app.use(cors());

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(rateLimit({ windowMs: 60000, max: 60 }));

app.use("/webhook", webhookRoutes);

app.get("/health", (req, res) => res.send("OK"));
const { regenerarHorariosPorNegocio } = require("./services/cron.service");

app.post("/regenerar-horarios", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Falta userId" });
  await regenerarHorariosPorNegocio(userId);
  res.json({ ok: true });
});

app.post("/crear-preferencia", async (req, res) => {
  const { access_token, titulo, precio, nombre, telefono } = req.body;

  try {
    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: titulo,
              quantity: 1,
              unit_price: precio,
              currency_id: "ARS",
            },
          ],
          payer: {
            name: nombre,
            phone: { number: telefono },
          },
          back_urls: {
            success: "https://harmonious-fudge-da1512.netlify.app/confirmado",
            failure: "https://harmonious-fudge-da1512.netlify.app/pago-fallido",
            pending: "https://harmonious-fudge-da1512.netlify.app/confirmado",
          },
          auto_return: "approved",
        }),
      },
    );

    const data = await response.json();
    res.json({ init_point: data.init_point });
  } catch (error) {
    res.status(500).json({ error: "Error al crear preferencia" });
  }
});
app.post("/notificar-reserva", async (req, res) => {
  const { push_token, cliente_nombre, fecha, hora, servicio } = req.body;

  if (!push_token) return res.json({ ok: false });

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: push_token,
        title: "📅 Nueva reserva",
        body: `${cliente_nombre} reservó el ${fecha} a las ${hora}${servicio ? ` — ${servicio}` : ""}`,
        sound: "default",
      }),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});

module.exports = app;
