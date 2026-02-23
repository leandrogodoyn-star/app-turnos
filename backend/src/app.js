const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const webhookRoutes = require("./routes/webhook.routes");

const app = express(); // ← FALTABA ESTO

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

module.exports = app;
