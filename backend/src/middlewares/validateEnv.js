const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_NUMBER",
];

required.forEach((v) => {
  if (!process.env[v]) throw new Error(`Missing env ${v}`);
});
