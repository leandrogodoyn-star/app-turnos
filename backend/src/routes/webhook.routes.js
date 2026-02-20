const router = require("express").Router();
const controller = require("../controllers/webhook.controller");

router.post("/twilio", controller.handleIncoming);

module.exports = router;
