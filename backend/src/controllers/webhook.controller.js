const botService = require("../services/bot.service");
const logger = require("../config/logger"); // ← faltaba esto

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
