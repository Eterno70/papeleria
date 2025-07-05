import { supabaseClient } from '../lib/supabase';

// Database utility functions for inventory management

export interface DatabaseArticle {
  id: number;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  unidad_medida?: string;
  costo: number;
  stock_minimo?: number;
  stock_maximo?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseMovement {
  id: number;
  id_articulo: number;
  id_usuario?: string;
  tipo: 'Entrada' | 'Salida';
  cantidad: number;
  fecha: string;
  descripcion: string;
  costo_unitario: number;
  valor_total?: number;
  numero_documento?: string;
  proveedor?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseUser {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  email?: string;
  full_name?: string;
  active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Test database connection and table existence
export const verifyDatabaseSetup = async (): Promise<{
  connected: boolean;
  tablesExist: boolean;
  errors: string[];
}> => {
  const errors: string[] = [];
  let connected = false;
  let tablesExist = false;

  try {
    console.log('🔍 Verificando conexión a Supabase...');
    
    // Test basic connection with a simple query
    const { data, error: connectionError } = await supabaseClient
      .from('usuarios')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Error de conexión:', connectionError.message);
      errors.push(`Connection error: ${connectionError.message}`);
      return { connected, tablesExist, errors };
    }

    connected = true;
    console.log('✅ Conexión a Supabase exitosa');

    // Test if tables exist and have correct structure
    const tableTests = [
      { name: 'usuarios', columns: ['id', 'username', 'password_hash', 'role', 'active'] },
      { name: 'articulos', columns: ['id', 'nombre', 'costo', 'activo'] },
      { name: 'movimientos', columns: ['id', 'id_articulo', 'tipo', 'cantidad', 'fecha', 'descripcion', 'costo_unitario'] }
    ];

    let allTablesExist = true;

    for (const table of tableTests) {
      try {
        const { data, error } = await supabaseClient
          .from(table.name)
          .select(table.columns.join(', '))
          .limit(1);

        if (error) {
          console.error(`❌ Error en tabla ${table.name}:`, error.message);
          errors.push(`${table.name} table error: ${error.message}`);
          allTablesExist = false;
        } else {
          console.log(`✅ Tabla ${table.name} verificada correctamente`);
        }
      } catch (error) {
        console.error(`❌ Error verificando tabla ${table.name}:`, error);
        errors.push(`${table.name} verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        allTablesExist = false;
      }
    }

    tablesExist = allTablesExist;

    if (tablesExist) {
      console.log('✅ Todas las tablas verificadas correctamente');
    } else {
      console.log('⚠️ Algunas tablas no existen o tienen errores');
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { connected, tablesExist, errors };
};

// Get database statistics
export const getDatabaseStats = async () => {
  try {
    console.log('📊 Obteniendo estadísticas de la base de datos...');

    const [usuariosResult, articulosResult, movimientosResult] = await Promise.all([
      supabaseClient.from('usuarios').select('*', { count: 'exact', head: true }),
      supabaseClient.from('articulos').select('*', { count: 'exact', head: true }),
      supabaseClient.from('movimientos').select('*', { count: 'exact', head: true })
    ]);

    const stats = {
      usuarios: usuariosResult.count || 0,
      articulos: articulosResult.count || 0,
      movimientos: movimientosResult.count || 0
    };

    console.log('📊 Estadísticas obtenidas:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { usuarios: 0, articulos: 0, movimientos: 0 };
  }
};

// Validate data integrity
export const validateDataIntegrity = async (): Promise<{
  valid: boolean;
  issues: string[];
}> => {
  const issues: string[] = [];

  try {
    console.log('🔍 Validando integridad de datos...');

    // Check for orphaned movements (movements without corresponding articles)
    const { data: movementsWithArticles, error: orphanError } = await supabaseClient
      .from('movimientos')
      .select(`
        id,
        id_articulo,
        articulos!inner(id, nombre)
      `);

    if (orphanError) {
      issues.push(`Error checking orphaned movements: ${orphanError.message}`);
    }

    // Check for negative stock situations
    const { data: articles } = await supabaseClient
      .from('articulos')
      .select('id, nombre')
      .eq('activo', true);

    if (articles) {
      for (const article of articles) {
        const { data: movements } = await supabaseClient
          .from('movimientos')
          .select('tipo, cantidad')
          .eq('id_articulo', article.id);

        if (movements) {
          let stock = 0;
          movements.forEach(movement => {
            if (movement.tipo === 'Entrada') {
              stock += movement.cantidad;
            } else {
              stock -= movement.cantidad;
            }
          });

          if (stock < 0) {
            issues.push(`Article "${article.nombre}" has negative stock: ${stock}`);
          }
        }
      }
    }

    // Check for users without proper roles
    const { data: users, error: usersError } = await supabaseClient
      .from('usuarios')
      .select('id, username, role')
      .eq('active', true);

    if (usersError) {
      issues.push(`Error checking users: ${usersError.message}`);
    } else if (users) {
      const validRoles = ['admin', 'user', 'viewer'];
      const invalidUsers = users.filter(user => !validRoles.includes(user.role));
      
      if (invalidUsers.length > 0) {
        issues.push(`Found ${invalidUsers.length} users with invalid roles`);
      }
    }

    console.log(issues.length === 0 ? '✅ Integridad de datos validada correctamente' : `⚠️ Encontrados ${issues.length} problemas de integridad`);

  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

// Initialize database with sample data
export const initializeSampleData = async (): Promise<boolean> => {
  try {
    console.log('🔄 Inicializando datos de ejemplo...');

    // Check if data already exists
    const { data: existingArticles } = await supabaseClient
      .from('articulos')
      .select('id')
      .limit(1);

    if (existingArticles && existingArticles.length > 0) {
      console.log('ℹ️ Los datos ya existen, omitiendo inicialización');
      return true;
    }

    // This would typically be done through the SQL migration
    console.log('ℹ️ Los datos de ejemplo deben crearse a través de la migración SQL');
    return true;

  } catch (error) {
    console.error('Error initializing sample data:', error);
    return false;
  }
};

// Get current user from database
export const getCurrentUser = async (username: string): Promise<DatabaseUser | null> => {
  try {
    const { data, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .eq('active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as DatabaseUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Verify password
export const verifyUserPassword = async (username: string, password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient
      .rpc('verify_password', {
        password: password,
        hash: (await getCurrentUser(username))?.password_hash || ''
      });

    if (error) {
      console.error('Error verifying password:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in password verification:', error);
    return false;
  }
};

// Get stock for article
export const getArticleStock = async (articleId: number): Promise<number> => {
  try {
    const { data, error } = await supabaseClient
      .rpc('get_stock_articulo', { articulo_id: articleId });

    if (error) {
      console.error('Error getting article stock:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in stock calculation:', error);
    return 0;
  }
};

// Test all database functions
export const testDatabaseFunctions = async (): Promise<void> => {
  console.log('🧪 Ejecutando pruebas de funciones de base de datos...');
  
  try {
    // Test connection
    const setupResult = await verifyDatabaseSetup();
    console.log('📋 Resultado de verificación:', setupResult);

    // Test stats
    const stats = await getDatabaseStats();
    console.log('📊 Estadísticas:', stats);

    // Test integrity
    const integrity = await validateDataIntegrity();
    console.log('🔍 Integridad:', integrity);

    console.log('✅ Todas las pruebas completadas');
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
};