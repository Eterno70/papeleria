const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const SUPABASE_URL = 'https://sstfgrbvltvxcmutgsmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdGZncmJ2bHR2eGNtdXRnc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NzkzNDYsImV4cCI6MjA2NzE1NTM0Nn0.dYYclh7BHivtmhss8ioGYE4n2kdAEH_Isq4sNXlY670';

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
      console.error('Error al consultar usuarios:', error.message);
      return;
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
        console.log(`   Último acceso: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Nunca'}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
    
    console.log('===== FIN DEL REPORTE =====');
  } catch (error) {
    console.error('Error general:', error);
  }
}

// Ejecutar la consulta
consultarUsuarios();
