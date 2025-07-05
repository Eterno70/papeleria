/*
  # Create inventory management system tables

  1. New Tables
    - `articulos`
      - `id` (bigserial, primary key)
      - `nombre` (varchar, unique, not null)
      - `costo` (numeric, default 0.00)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `movimientos`
      - `id` (bigserial, primary key)
      - `id_articulo` (bigint, foreign key)
      - `tipo` (varchar, check constraint)
      - `cantidad` (integer, check constraint)
      - `fecha` (date)
      - `descripcion` (text)
      - `costo` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (internal system)

  3. Performance
    - Add indexes for common queries
    - Add triggers for automatic timestamp updates
*/

-- Create articulos table
CREATE TABLE IF NOT EXISTS articulos (
  id bigserial PRIMARY KEY,
  nombre varchar(255) NOT NULL,
  costo numeric(10,2) DEFAULT 0.00 NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add unique constraint on nombre if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'articulos_nombre_key' 
    AND table_name = 'articulos'
  ) THEN
    ALTER TABLE articulos ADD CONSTRAINT articulos_nombre_key UNIQUE (nombre);
  END IF;
END $$;

-- Create movimientos table
CREATE TABLE IF NOT EXISTS movimientos (
  id bigserial PRIMARY KEY,
  id_articulo bigint NOT NULL,
  tipo varchar(50) NOT NULL,
  cantidad integer NOT NULL,
  fecha date NOT NULL,
  descripcion text,
  costo numeric(10,2) DEFAULT 0.00 NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'movimientos_id_articulo_fkey' 
    AND table_name = 'movimientos'
  ) THEN
    ALTER TABLE movimientos ADD CONSTRAINT movimientos_id_articulo_fkey 
    FOREIGN KEY (id_articulo) REFERENCES articulos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add check constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'movimientos_tipo_check'
  ) THEN
    ALTER TABLE movimientos ADD CONSTRAINT movimientos_tipo_check 
    CHECK (tipo IN ('Entrada', 'Salida'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'movimientos_cantidad_check'
  ) THEN
    ALTER TABLE movimientos ADD CONSTRAINT movimientos_cantidad_check 
    CHECK (cantidad > 0);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articulos_nombre ON articulos(nombre);
CREATE INDEX IF NOT EXISTS idx_movimientos_articulo ON movimientos(id_articulo);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_articulos_updated_at ON articulos;
CREATE TRIGGER update_articulos_updated_at
    BEFORE UPDATE ON articulos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_movimientos_updated_at ON movimientos;
CREATE TRIGGER update_movimientos_updated_at
    BEFORE UPDATE ON movimientos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (internal system)
DROP POLICY IF EXISTS "Allow all operations on articulos" ON articulos;
CREATE POLICY "Allow all operations on articulos"
  ON articulos
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on movimientos" ON movimientos;
CREATE POLICY "Allow all operations on movimientos"
  ON movimientos
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert sample data for testing (using safe approach)
DO $$
DECLARE
    papel_id bigint;
    lapiceros_id bigint;
    folders_id bigint;
    grapas_id bigint;
    clips_id bigint;
BEGIN
    -- Insert articles only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM articulos WHERE nombre = 'PAPEL BOND CARTA') THEN
        INSERT INTO articulos (nombre, costo) VALUES ('PAPEL BOND CARTA', 5.50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM articulos WHERE nombre = 'LAPICEROS AZULES') THEN
        INSERT INTO articulos (nombre, costo) VALUES ('LAPICEROS AZULES', 0.75);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM articulos WHERE nombre = 'FOLDERS MANILA') THEN
        INSERT INTO articulos (nombre, costo) VALUES ('FOLDERS MANILA', 0.25);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM articulos WHERE nombre = 'GRAPAS ESTÁNDAR') THEN
        INSERT INTO articulos (nombre, costo) VALUES ('GRAPAS ESTÁNDAR', 2.00);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM articulos WHERE nombre = 'CLIPS METÁLICOS') THEN
        INSERT INTO articulos (nombre, costo) VALUES ('CLIPS METÁLICOS', 1.50);
    END IF;
    
    -- Get article IDs for movements
    SELECT id INTO papel_id FROM articulos WHERE nombre = 'PAPEL BOND CARTA';
    SELECT id INTO lapiceros_id FROM articulos WHERE nombre = 'LAPICEROS AZULES';
    SELECT id INTO folders_id FROM articulos WHERE nombre = 'FOLDERS MANILA';
    SELECT id INTO grapas_id FROM articulos WHERE nombre = 'GRAPAS ESTÁNDAR';
    SELECT id INTO clips_id FROM articulos WHERE nombre = 'CLIPS METÁLICOS';
    
    -- Insert sample movements only if they don't exist
    IF papel_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM movimientos 
        WHERE id_articulo = papel_id AND descripcion = 'COMPRA INICIAL DE PAPEL'
    ) THEN
        INSERT INTO movimientos (id_articulo, tipo, cantidad, fecha, descripcion, costo) VALUES
        (papel_id, 'Entrada', 100, '2025-01-01', 'COMPRA INICIAL DE PAPEL', 5.50),
        (papel_id, 'Salida', 25, '2025-01-10', 'ENTREGA A DEPARTAMENTO ADMINISTRATIVO', 5.50);
    END IF;
    
    IF lapiceros_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM movimientos 
        WHERE id_articulo = lapiceros_id AND descripcion = 'COMPRA INICIAL DE LAPICEROS'
    ) THEN
        INSERT INTO movimientos (id_articulo, tipo, cantidad, fecha, descripcion, costo) VALUES
        (lapiceros_id, 'Entrada', 200, '2025-01-01', 'COMPRA INICIAL DE LAPICEROS', 0.75),
        (lapiceros_id, 'Salida', 50, '2025-01-15', 'DISTRIBUCIÓN A OFICINAS', 0.75);
    END IF;
    
    IF folders_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM movimientos 
        WHERE id_articulo = folders_id AND descripcion = 'COMPRA INICIAL DE FOLDERS'
    ) THEN
        INSERT INTO movimientos (id_articulo, tipo, cantidad, fecha, descripcion, costo) VALUES
        (folders_id, 'Entrada', 500, '2025-01-01', 'COMPRA INICIAL DE FOLDERS', 0.25),
        (folders_id, 'Salida', 100, '2025-01-12', 'ENTREGA A ARCHIVO GENERAL', 0.25);
    END IF;
    
    IF grapas_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM movimientos 
        WHERE id_articulo = grapas_id AND descripcion = 'COMPRA INICIAL DE GRAPAS'
    ) THEN
        INSERT INTO movimientos (id_articulo, tipo, cantidad, fecha, descripcion, costo) VALUES
        (grapas_id, 'Entrada', 50, '2025-01-02', 'COMPRA INICIAL DE GRAPAS', 2.00);
    END IF;
    
    IF clips_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM movimientos 
        WHERE id_articulo = clips_id AND descripcion = 'COMPRA INICIAL DE CLIPS'
    ) THEN
        INSERT INTO movimientos (id_articulo, tipo, cantidad, fecha, descripcion, costo) VALUES
        (clips_id, 'Entrada', 100, '2025-01-03', 'COMPRA INICIAL DE CLIPS', 1.50);
    END IF;
END $$;