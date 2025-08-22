import React from 'react';
import VerUsuarios from '../VerUsuarios';

const UsuariosView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios del Sistema</h1>
        <div className="text-sm text-gray-500">
          Modo de solo lectura
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <VerUsuarios />
        </div>
      </div>
    </div>
  );
};

export default UsuariosView;
