exports.handleIncoming = async (req, res) => {
  // Responder con TwiML vacío en lugar de sendStatus(200)
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
