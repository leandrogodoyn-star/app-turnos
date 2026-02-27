-- 1. Agregar campos a profiles para el plan Premium y Turnos Mensuales
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reservas_mes INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Crear tabla de profesionales vinculada a los administradores
CREATE TABLE IF NOT EXISTS profesionales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  especialidad TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Habilitar RLS para profesionales
ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los admin pueden ver sus propios profesionales"
ON profesionales FOR SELECT
TO authenticated
USING (auth.uid() = admin_id);

CREATE POLICY "Los admin pueden insertar sus propios profesionales"
ON profesionales FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Los admin pueden actualizar sus propios profesionales"
ON profesionales FOR UPDATE
TO authenticated
USING (auth.uid() = admin_id);

CREATE POLICY "Los admin pueden eliminar sus propios profesionales"
ON profesionales FOR DELETE
TO authenticated
USING (auth.uid() = admin_id);

-- 4. Modificar la tabla de reservas para incluir profesional_id opcional
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS profesional_id UUID REFERENCES profesionales(id) ON DELETE SET NULL;

-- 5. Crear una función para resetear el contador de reservas_mes cada mes
-- Esta parte es opcional pero recomendada para automatizar el límite de 60
CREATE OR REPLACE FUNCTION reset_monthly_reservations()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET reservas_mes = 0, last_reset = now()
  WHERE last_reset < (now() - interval '1 month');
END;
$$ LANGUAGE plpgsql;
