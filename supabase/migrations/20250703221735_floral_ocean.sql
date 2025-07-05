-- =============================================
-- SISTEMA DE INVENTARIO - RLS MÍNIMO INVASIVO
-- =============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- FUNCIONES AUXILIARES
-- =============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para hash de contraseñas
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$ language 'plpgsql';

-- Función para verificar contraseñas
CREATE OR REPLACE FUNCTION verify_password(password text, hash text)
RETURNS boolean AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ language 'plpgsql';

-- =============================================
-- TABLA: usuarios
-- =============================================
DROP TABLE IF EXISTS usuarios CASCADE;
CREATE TABLE usuarios (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'user',
    email text,
    full_name text,
    active boolean DEFAULT true,
    last_login timestamptz,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT usuarios_role_check CHECK (role IN ('admin', 'user', 'viewer'))
);

-- Índices para usuarios
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_active ON usuarios(active);

-- Trigger para updated_at en usuarios
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLA: articulos
-- =============================================
DROP TABLE IF EXISTS articulos CASCADE;
CREATE TABLE articulos (
    id bigserial PRIMARY KEY,
    codigo text UNIQUE,
    nombre text UNIQUE NOT NULL,
    descripcion text,
    categoria text DEFAULT 'GENERAL',
    unidad_medida text DEFAULT 'UNIDAD',
    costo numeric(12,2) DEFAULT 0.00 NOT NULL,
    stock_minimo integer DEFAULT 5,
    stock_maximo integer DEFAULT 1000,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT articulos_costo_check CHECK (costo >= 0),
    CONSTRAINT articulos_stock_minimo_check CHECK (stock_minimo >= 0),
    CONSTRAINT articulos_stock_maximo_check CHECK (stock_maximo >= stock_minimo)
);

-- Índices para articulos
CREATE INDEX idx_articulos_nombre ON articulos(nombre);
CREATE INDEX idx_articulos_codigo ON articulos(codigo);
CREATE INDEX idx_articulos_categoria ON articulos(categoria);
CREATE INDEX idx_articulos_activo ON articulos(activo);

-- Trigger para updated_at en articulos
CREATE TRIGGER update_articulos_updated_at
    BEFORE UPDATE ON articulos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TABLA: movimientos
-- =============================================
DROP TABLE IF EXISTS movimientos CASCADE;
CREATE TABLE movimientos (
    id bigserial PRIMARY KEY,
    id_articulo bigint NOT NULL REFERENCES articulos(id) ON DELETE CASCADE,
    id_usuario uuid REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo text NOT NULL,
    cantidad integer NOT NULL,
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    descripcion text NOT NULL,
    costo_unitario numeric(12,2) NOT NULL DEFAULT 0.00,
    valor_total numeric(12,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
    numero_documento text,
    proveedor text,
    observaciones text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT movimientos_tipo_check CHECK (tipo IN ('Entrada', 'Salida')),
    CONSTRAINT movimientos_cantidad_check CHECK (cantidad > 0),
    CONSTRAINT movimientos_costo_check CHECK (costo_unitario >= 0)
);

-- Índices para movimientos
CREATE INDEX idx_movimientos_articulo ON movimientos(id_articulo);
CREATE INDEX idx_movimientos_usuario ON movimientos(id_usuario);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX idx_movimientos_fecha_tipo ON movimientos(fecha, tipo);

-- Trigger para updated_at en movimientos
CREATE TRIGGER update_movimientos_updated_at
    BEFORE UPDATE ON movimientos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VISTA: stock_actual
-- =============================================
CREATE OR REPLACE VIEW stock_actual AS
SELECT 
    a.id,
    a.codigo,
    a.nombre,
    a.categoria,
    a.unidad_medida,
    a.costo,
    a.stock_minimo,
    a.stock_maximo,
    COALESCE(
        (SELECT SUM(CASE WHEN m.tipo = 'Entrada' THEN m.cantidad ELSE -m.cantidad END)
         FROM movimientos m 
         WHERE m.id_articulo = a.id), 0
    ) as stock_actual,
    CASE 
        WHEN COALESCE(
            (SELECT SUM(CASE WHEN m.tipo = 'Entrada' THEN m.cantidad ELSE -m.cantidad END)
             FROM movimientos m 
             WHERE m.id_articulo = a.id), 0
        ) = 0 THEN 'Sin Stock'
        WHEN COALESCE(
            (SELECT SUM(CASE WHEN m.tipo = 'Entrada' THEN m.cantidad ELSE -m.cantidad END)
             FROM movimientos m 
             WHERE m.id_articulo = a.id), 0
        ) <= a.stock_minimo THEN 'Stock Bajo'
        ELSE 'Stock Normal'
    END as estado_stock,
    a.activo,
    a.created_at,
    a.updated_at
FROM articulos a
WHERE a.activo = true;

-- =============================================
-- FUNCIONES ÚTILES
-- =============================================

-- Función para obtener stock de un artículo
CREATE OR REPLACE FUNCTION get_stock_articulo(articulo_id bigint)
RETURNS integer AS $$
DECLARE
    stock_total integer;
BEGIN
    SELECT COALESCE(
        SUM(CASE WHEN tipo = 'Entrada' THEN cantidad ELSE -cantidad END), 0
    ) INTO stock_total
    FROM movimientos
    WHERE id_articulo = articulo_id;
    
    RETURN stock_total;
END;
$$ LANGUAGE plpgsql;

-- Función para validar stock antes de salida (opcional)
CREATE OR REPLACE FUNCTION validate_stock_salida()
RETURNS TRIGGER AS $$
DECLARE
    stock_actual integer;
BEGIN
    IF NEW.tipo = 'Salida' THEN
        stock_actual := get_stock_articulo(NEW.id_articulo);
        
        IF stock_actual < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente. Stock actual: %, Cantidad solicitada: %', 
                stock_actual, NEW.cantidad;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar stock en salidas (comentado para ser menos invasivo)
-- CREATE TRIGGER validate_stock_before_salida
--     BEFORE INSERT ON movimientos
--     FOR EACH ROW
--     EXECUTE FUNCTION validate_stock_salida();

-- =============================================
-- SEGURIDAD (RLS MÍNIMO INVASIVO)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS MUY PERMISIVAS (MÍNIMO INVASIVO)
-- =============================================

-- Políticas para usuarios - ACCESO TOTAL
CREATE POLICY "Acceso total a usuarios"
    ON usuarios FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Políticas para artículos - ACCESO TOTAL
CREATE POLICY "Acceso total a artículos"
    ON articulos FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Políticas para movimientos - ACCESO TOTAL
CREATE POLICY "Acceso total a movimientos"
    ON movimientos FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Insertar usuario administrador
INSERT INTO usuarios (username, password_hash, role, full_name, email) 
VALUES (
    'admin', 
    hash_password('123456'), 
    'admin', 
    'Administrador del Sistema',
    'admin@alcaldia.gob.sv'
);

-- Insertar otros usuarios de ejemplo
INSERT INTO usuarios (username, password_hash, role, full_name, email) VALUES
    ('alcalde', hash_password('alcalde2025'), 'admin', 'Alcalde Municipal', 'alcalde@alcaldia.gob.sv'),
    ('informatica', hash_password('info123'), 'user', 'Unidad de Informática', 'informatica@alcaldia.gob.sv'),
    ('usuario', hash_password('usuario123'), 'user', 'Usuario General', 'usuario@alcaldia.gob.sv');

-- Insertar artículos de ejemplo
INSERT INTO articulos (codigo, nombre, descripcion, categoria, unidad_medida, costo, stock_minimo) VALUES
    ('ART001', 'PAPEL BOND CARTA', 'Papel bond tamaño carta 75g', 'PAPELERIA', 'RESMA', 5.50, 10),
    ('ART002', 'LAPICEROS AZULES', 'Lapiceros de tinta azul', 'PAPELERIA', 'UNIDAD', 0.75, 20),
    ('ART003', 'FOLDERS MANILA', 'Folders de cartón manila', 'PAPELERIA', 'UNIDAD', 0.25, 50),
    ('ART004', 'GRAPAS ESTÁNDAR', 'Grapas estándar 26/6', 'PAPELERIA', 'CAJA', 2.00, 5),
    ('ART005', 'CLIPS METÁLICOS', 'Clips metálicos #1', 'PAPELERIA', 'CAJA', 1.50, 10),
    ('ART006', 'TINTA IMPRESORA NEGRA', 'Cartucho de tinta negra HP', 'INFORMATICA', 'UNIDAD', 25.00, 2),
    ('ART007', 'PAPEL FOTOCOPIA A4', 'Papel para fotocopia tamaño A4', 'PAPELERIA', 'RESMA', 6.00, 8),
    ('ART008', 'MARCADORES PERMANENTES', 'Marcadores permanentes colores', 'PAPELERIA', 'UNIDAD', 1.25, 15);

-- Insertar movimientos de ejemplo
DO $$
DECLARE
    admin_id uuid;
    papel_id bigint;
    lapiceros_id bigint;
    folders_id bigint;
    grapas_id bigint;
    clips_id bigint;
BEGIN
    -- Obtener ID del usuario admin
    SELECT id INTO admin_id FROM usuarios WHERE username = 'admin';
    
    -- Obtener IDs de artículos
    SELECT id INTO papel_id FROM articulos WHERE codigo = 'ART001';
    SELECT id INTO lapiceros_id FROM articulos WHERE codigo = 'ART002';
    SELECT id INTO folders_id FROM articulos WHERE codigo = 'ART003';
    SELECT id INTO grapas_id FROM articulos WHERE codigo = 'ART004';
    SELECT id INTO clips_id FROM articulos WHERE codigo = 'ART005';
    
    -- Insertar movimientos de entrada
    INSERT INTO movimientos (id_articulo, id_usuario, tipo, cantidad, fecha, descripcion, costo_unitario, proveedor) VALUES
        (papel_id, admin_id, 'Entrada', 100, '2025-01-01', 'COMPRA INICIAL DE PAPEL BOND', 5.50, 'DISTRIBUIDORA ESCOLAR SA'),
        (lapiceros_id, admin_id, 'Entrada', 200, '2025-01-01', 'COMPRA INICIAL DE LAPICEROS', 0.75, 'DISTRIBUIDORA ESCOLAR SA'),
        (folders_id, admin_id, 'Entrada', 500, '2025-01-01', 'COMPRA INICIAL DE FOLDERS', 0.25, 'DISTRIBUIDORA ESCOLAR SA'),
        (grapas_id, admin_id, 'Entrada', 50, '2025-01-02', 'COMPRA INICIAL DE GRAPAS', 2.00, 'LIBRERIA CENTRAL'),
        (clips_id, admin_id, 'Entrada', 100, '2025-01-03', 'COMPRA INICIAL DE CLIPS', 1.50, 'LIBRERIA CENTRAL');
    
    -- Insertar algunos movimientos de salida
    INSERT INTO movimientos (id_articulo, id_usuario, tipo, cantidad, fecha, descripcion, costo_unitario) VALUES
        (papel_id, admin_id, 'Salida', 25, '2025-01-10', 'ENTREGA A DEPARTAMENTO ADMINISTRATIVO', 5.50),
        (lapiceros_id, admin_id, 'Salida', 50, '2025-01-15', 'DISTRIBUCIÓN A OFICINAS MUNICIPALES', 0.75),
        (folders_id, admin_id, 'Salida', 100, '2025-01-12', 'ENTREGA A ARCHIVO GENERAL', 0.25);
        
END $$;

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

-- Mostrar resumen de datos insertados
DO $$
DECLARE
    usuarios_count integer;
    articulos_count integer;
    movimientos_count integer;
BEGIN
    SELECT COUNT(*) INTO usuarios_count FROM usuarios;
    SELECT COUNT(*) INTO articulos_count FROM articulos;
    SELECT COUNT(*) INTO movimientos_count FROM movimientos;
    
    RAISE NOTICE '✅ Base de datos inicializada con RLS mínimo invasivo:';
    RAISE NOTICE '   - Usuarios: %', usuarios_count;
    RAISE NOTICE '   - Artículos: %', articulos_count;
    RAISE NOTICE '   - Movimientos: %', movimientos_count;
    RAISE NOTICE '   - RLS habilitado pero con políticas permisivas';
    RAISE NOTICE '   - Usuario admin: admin/123456';
END $$;