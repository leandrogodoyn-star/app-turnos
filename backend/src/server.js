require("dotenv").config();
const app = require("./app");
const logger = require("./config/logger");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on ${PORT}`));

// ---------- src/app.js ----------
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const webhookRoutes = require("./routes/webhook.routes");

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(rateLimit({ windowMs: 60000, max: 60 }));

app.use("/webhook", webhookRoutes);

app.get("/health", (req, res) => res.send("OK"));

module.exports = app;

// ---------- src/config/logger.js ----------
const pino = require("pino");
module.exports = pino({ transport: { target: "pino-pretty" } });
