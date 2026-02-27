const router = require("express").Router();
const controller = require("../controllers/webhook.controller");

router.post("/twilio", controller.handleIncoming);
router.post("/mercadopago", controller.handleMercadoPago);

module.exports = router;
