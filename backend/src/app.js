const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const webhookRoutes = require("./routes/webhook.routes");
const { regenerarHorariosPorNegocio } = require("./services/cron.service");

const app = express();

app.use(cors());

// Seguridad: trust proxy para rate limiter detrás de hosting (Render/Heroku)
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "1mb" })); // Evitar payloads gigantes
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Rate limiting global: 100 requests por minuto por IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones. Intente más tarde." }
});
app.use(limiter);

app.use("/webhook", webhookRoutes);

app.get("/health", (req, res) => res.send("OK"));

// Validadores Zod
const bodyRegenerarSchema = z.object({
  userId: z.string().uuid({ message: "userId debe ser un UUID válido" }),
});

const bodyPreferenciaSchema = z.object({
  access_token: z.string().min(10, { message: "Access token inválido" }),
  titulo: z.string().min(1).max(100),
  precio: z.number().positive(),
  nombre: z.string().min(2).max(100),
  telefono: z.string().min(6).max(20),
});

const bodyNotificacionSchema = z.object({
  push_token: z.string().startsWith("ExponentPushToken", { message: "Token inválido" }),
  cliente_nombre: z.string().min(1).max(100),
  fecha: z.string().min(1),
  hora: z.string().min(1),
  servicio: z.string().nullable().optional(),
});

// Middleware de validación genérico
const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({
      error: "Datos de entrada inválidos",
      detalles: err.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }
};

app.post("/regenerar-horarios", validateBody(bodyRegenerarSchema), async (req, res) => {
  try {
    await regenerarHorariosPorNegocio(req.body.userId);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error al regenerar horarios" });
  }
});

app.post("/crear-suscripcion-dinamica", async (req, res) => {
  const { userId, email } = req.body;

  if (!userId) return res.status(400).json({ error: "userId es requerido" });

  try {
    const response = await fetch(
      "https://api.mercadopago.com/preapproval",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          preapproval_plan_id: process.env.MP_PLAN_ID,
          reason: "Suscripción Premium App Turnos",
          external_reference: userId,
          payer_email: email || "test_user_123@testuser.com", // Solo para pruebas si no viene
          back_url: "https://harmonious-fudge-da1512.netlify.app/confirmado",
          auto_return: "approved",
          status: "pending"
        }),
      },
    );

    if (!response.ok) {
      const errData = await response.json();
      console.error("Error MP Sub:", errData);
      throw new Error(`Error MP: ${response.status}`);
    }

    const data = await response.json();
    res.json({ init_point: data.init_point });
  } catch (error) {
    console.error("Error Mercado Pago Suscripción:", error);
    res.status(500).json({ error: "Error al crear suscripción" });
  }
});

app.post("/crear-preferencia", validateBody(bodyPreferenciaSchema), async (req, res) => {
  const { access_token, titulo, precio, nombre, telefono } = req.body;

  try {
    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: titulo,
              quantity: 1,
              unit_price: precio,
              currency_id: "ARS",
            },
          ],
          payer: {
            name: nombre,
            phone: { number: telefono },
          },
          back_urls: {
            success: "https://harmonious-fudge-da1512.netlify.app/confirmado",
            failure: "https://harmonious-fudge-da1512.netlify.app/pago-fallido",
            pending: "https://harmonious-fudge-da1512.netlify.app/confirmado",
          },
          auto_return: "approved",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Error MP: ${response.status}`);
    }

    const data = await response.json();
    res.json({ init_point: data.init_point });
  } catch (error) {
    console.error("Error Mercado Pago:", error);
    res.status(500).json({ error: "Error interno al crear preferencia de pago" });
  }
});

app.get("/mp-auth-callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send("Faltan parámetros (code o state)");
  }

  try {
    // 1. Intercambiar code por access_token
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_secret: process.env.MP_CLIENT_SECRET,
        client_id: process.env.MP_CLIENT_ID,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.MP_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error al intercambiar token:", errorData);
      throw new Error("Error en el intercambio de tokens con Mercado Pago");
    }

    const data = await response.json();
    const accessToken = data.access_token;

    // 2. Actualizar perfil en Supabase (usando state como userId)
    // Nota: Aquí necesitaríamos configurar supabase-js en el backend si aún no está, 
    // o simplemente devolver una página de éxito que la app procese.

    // Por ahora, redirigimos a una página de éxito o error
    res.redirect(`https://harmonious-fudge-da1512.netlify.app/vincular-exito?token=${accessToken}`);
  } catch (error) {
    console.error("Error en OAuth callback:", error);
    res.status(500).send("Error al vincular la cuenta. Intente nuevamente.");
  }
});

app.post("/notificar-reserva", validateBody(bodyNotificacionSchema), async (req, res) => {
  const { push_token, cliente_nombre, fecha, hora, servicio } = req.body;

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: push_token,
        title: "📅 Nueva reserva",
        body: `${cliente_nombre} reservó el ${fecha} a las ${hora}${servicio ? ` — ${servicio}` : ""}`,
        sound: "default",
      }),
    });

    if (!response.ok) {
      throw new Error(`Error Expo: ${response.status}`);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error Notificación:", error);
    res.status(500).json({ error: "Error al enviar notificación push" });
  }
});

module.exports = app;
