const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const webhookRoutes = require("./routes/webhook.routes");

const app = express(); // ← FALTABA ESTO

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(rateLimit({ windowMs: 60000, max: 60 }));

app.use("/webhook", webhookRoutes);

app.get("/health", (req, res) => res.send("OK"));

module.exports = app;
