const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Configuración para cargar variables de entorno
dotenv.config();

// Verificar si las variables de entorno están disponibles
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Si no están disponibles en el entorno, intentar cargarlas desde .env
if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = dotenv.parse(envContent);
    
    supabaseUrl = envVars.VITE_SUPABASE_URL;
    supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables de entorno no encontradas');
    }
  } catch (error) {
    console.error('Error al cargar variables de entorno:', error.message);
    process.exit(1);
  }
}

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para consultar usuarios
async function consultarUsuarios() {
  try {
    console.log('Conectando a Supabase...');
    
    // Realizar consulta de solo lectura a la tabla de usuarios
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, username, role, full_name, email, active, last_login, created_at')
      .order('role', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    console.log('\n===== USUARIOS DEL SISTEMA =====\n');
    
    if (usuarios.length === 0) {
      console.log('No se encontraron usuarios en el sistema.');
    } else {
      console.log(`Total de usuarios: ${usuarios.length}\n`);
      
      // Mostrar usuarios en formato de tabla
      console.table(usuarios.map(user => ({
        ID: user.id.substring(0, 8) + '...',
        Usuario: user.username,
        Rol: user.role,
        Nombre: user.full_name || '-',
        Email: user.email || '-',
        Activo: user.active ? 'Sí' : 'No',
        'Último Login': user.last_login ? new Date(user.last_login).toLocaleString() : 'Nunca'
      })));
      
      // Mostrar detalle de cada usuario
      console.log('\n--- DETALLE DE USUARIOS ---\n');
      usuarios.forEach((user, index) => {
        console.log(`[${index + 1}] ${user.username} (${user.role.toUpperCase()})`);
        console.log(`   Nombre completo: ${user.full_name || 'No especificado'}`);
        console.log(`   Email: ${user.email || 'No especificado'}`);
        console.log(`   Estado: ${user.active ? 'Activo' : 'Inactivo'}`);
        console.log(`   Último acceso: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Nunca'}`);
        console.log(`   Creado: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
    
    console.log('===== FIN DEL REPORTE =====');
  } catch (error) {
    console.error('Error al consultar usuarios:', error.message);
  }
}

// Ejecutar la consulta
consultarUsuarios();
