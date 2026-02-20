const botService = require("../services/bot.service");
const logger = require("../config/logger");

exports.handleIncoming = async (req, res) => {
  res.sendStatus(200);

  try {
    const from = req.body?.From?.replace(/\s/g, "");
    const text = req.body?.Body?.trim().toLowerCase();
    if (!from || !text) return;

    await botService.processMessage(from, text);
  } catch (err) {
    logger.error(err);
  }
};
