const db = require("../config/supabase");

exports.get = async (phone) => {
  const { data } = await db
    .from("bot_sessions")
    .select("*")
    .eq("phone", phone)
    .single();
  return data;
};

exports.create = async (phone) => {
  const { data } = await db
    .from("bot_sessions")
    .insert({ phone, state: "start" })
    .select()
    .single();
  return data;
};

exports.update = async (phone, values) =>
  db.from("bot_sessions").update(values).eq("phone", phone);

exports.delete = async (phone) =>
  db.from("bot_sessions").delete().eq("phone", phone);
