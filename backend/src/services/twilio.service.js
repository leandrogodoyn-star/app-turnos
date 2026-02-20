const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

exports.send = (to, body) =>
  client.messages.create({
    from: process.env.TWILIO_NUMBER,
    to,
    body,
  });
