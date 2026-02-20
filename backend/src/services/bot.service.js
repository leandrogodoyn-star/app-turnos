const sessionRepo = require("../repositories/session.repo");
const bookingService = require("./booking.service");
const twilioService = require("./twilio.service");

exports.processMessage = async (phone, text) => {
  let session = await sessionRepo.get(phone);

  if (!session) session = await sessionRepo.create(phone);

  if (text === "cancelar") {
    await sessionRepo.delete(phone);
    return twilioService.send(phone, "Conversación reiniciada");
  }

  switch (session.state) {
    case "start":
      await sessionRepo.update(phone, { state: "name" });
      return twilioService.send(phone, "¿Cuál es tu nombre?");

    case "name":
      await sessionRepo.update(phone, { state: "confirm", name: text });
      return twilioService.send(
        phone,
        `Confirmar reserva para ${text}? (si/no)`,
      );

    case "confirm":
      if (text === "si") {
        await bookingService.create({ phone, name: session.name });
        await sessionRepo.delete(phone);
        return twilioService.send(phone, "Reserva confirmada ✅");
      }
      break;
  }
};
