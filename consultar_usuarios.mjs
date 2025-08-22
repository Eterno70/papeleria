import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración para cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

// Verificar si las variables de entorno están disponibles
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Si no están disponibles en el entorno, intentar cargarlas desde .env
if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      for (const line of envLines) {
        const [key, value] = line.split('=');
        if (key === 'VITE_SUPABASE_URL') supabaseUrl = value.trim();
        if (key === 'VITE_SUPABASE_ANON_KEY') supabaseAnonKey = value.trim();
      }
    }
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables de entorno no encontradas');
    }
  } catch (error) {
    console.error('Error al cargar variables de entorno:', error.message);
    process.exit(1);
  }
}

console.log('URL de Supabase:', supabaseUrl);
console.log('Clave anónima disponible:', supabaseAnonKey ? 'Sí (valor oculto)' : 'No');

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
    
    if (!usuarios || usuarios.length === 0) {
      console.log('No se encontraron usuarios en el sistema.');
    } else {
      console.log(`Total de usuarios: ${usuarios.length}\n`);
      
      // Mostrar usuarios en formato simplificado
      usuarios.forEach((user, index) => {
        console.log(`[${index + 1}] ${user.username} (${user.role.toUpperCase()})`);
        console.log(`   Nombre: ${user.full_name || 'No especificado'}`);
        console.log(`   Email: ${user.email || 'No especificado'}`);
        console.log(`   Estado: ${user.active ? 'Activo' : 'Inactivo'}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
    
    console.log('===== FIN DEL REPORTE =====');
  } catch (error) {
    console.error('Error al consultar usuarios:', error.message);
    console.error('Detalles:', error);
  }
}

// Ejecutar la consulta
consultarUsuarios();
