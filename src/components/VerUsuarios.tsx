import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';

interface Usuario {
  id: string;
  username: string;
  role: string;
  full_name?: string;
  email?: string;
  active: boolean;
  last_login?: string;
  created_at: string;
}

const VerUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        setCargando(true);
        setError(null);
        
        // Consulta de solo lectura a la tabla de usuarios
        const { data, error } = await supabaseClient
          .from('usuarios')
          .select('id, username, role, full_name, email, active, last_login, created_at')
          .order('role', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setUsuarios(data || []);
      } catch (err: any) {
        console.error('Error al cargar usuarios:', err);
        setError(err.message || 'Error al cargar usuarios');
      } finally {
        setCargando(false);
      }
    };

    cargarUsuarios();
  }, []);

  if (cargando) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md my-4">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-center">Usuarios del Sistema</h1>
      
      {usuarios.length === 0 ? (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md">
          <p>No se encontraron usuarios en el sistema.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-gray-600">Total de usuarios: {usuarios.length}</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 shadow-md rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left border-b">Usuario</th>
                  <th className="py-3 px-4 text-left border-b">Rol</th>
                  <th className="py-3 px-4 text-left border-b">Nombre</th>
                  <th className="py-3 px-4 text-left border-b">Email</th>
                  <th className="py-3 px-4 text-left border-b">Estado</th>
                  <th className="py-3 px-4 text-left border-b">Último Acceso</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">{usuario.username}</td>
                    <td className="py-3 px-4 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${usuario.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                          usuario.role === 'user' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {usuario.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b">{usuario.full_name || '-'}</td>
                    <td className="py-3 px-4 border-b">{usuario.email || '-'}</td>
                    <td className="py-3 px-4 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${usuario.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {usuario.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b">
                      {usuario.last_login ? new Date(usuario.last_login).toLocaleString() : 'Nunca'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Detalle de Usuarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usuarios.map((usuario) => (
                <div key={`detail-${usuario.id}`} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold">{usuario.username}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                      ${usuario.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                        usuario.role === 'user' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {usuario.role}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <p><span className="font-semibold">Nombre:</span> {usuario.full_name || 'No especificado'}</p>
                    <p><span className="font-semibold">Email:</span> {usuario.email || 'No especificado'}</p>
                    <p><span className="font-semibold">Estado:</span> {usuario.active ? 'Activo' : 'Inactivo'}</p>
                    <p><span className="font-semibold">Último acceso:</span> {usuario.last_login ? new Date(usuario.last_login).toLocaleString() : 'Nunca'}</p>
                    <p><span className="font-semibold">Creado:</span> {new Date(usuario.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2 truncate"><span className="font-semibold">ID:</span> {usuario.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VerUsuarios;
