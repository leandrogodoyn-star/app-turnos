const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const webhookRoutes = require("./routes/webhook.routes");

const app = express(); // ← FALTABA ESTO
const cors = require("cors");

app.use(
  cors({
    origin: [
      "https://harmonious-fudge-da1512.netlify.app",
      "http://localhost:3000",
    ],
  }),
);

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

module.exports = app;
