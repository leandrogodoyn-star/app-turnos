require("dotenv").config();
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
const app = require("./app");
const logger = require("./config/logger");
const { iniciarCron } = require("./services/cron.service"); // ← agregá este import

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on ${PORT}`);
  iniciarCron(); // ← adentro del callback
});
