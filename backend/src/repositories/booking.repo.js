const db = require("../config/supabase");

exports.insert = async (booking) =>
  db.from("bookings").insert(booking).select().single();
