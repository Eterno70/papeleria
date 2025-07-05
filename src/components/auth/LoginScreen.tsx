import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Layers, User, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const prevAuth = useRef(isAuthenticated);

  // Limpiar los campos automáticamente cada vez que se muestre la pantalla de login
  useEffect(() => {
    // Si el usuario acaba de cerrar sesión (de true a false), limpiar campos
    if (prevAuth.current && !isAuthenticated) {
      setUsername('');
      setPassword('');
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(username, password);
      if (!success) {
        toast.error('Usuario o contraseña incorrectos');
      }
    } catch (error) {
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Logo and Header */}
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-xl mb-6"
          >
            <Layers className="h-10 w-10 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-3xl font-bold text-blue-900 mb-1">Alcaldía Municipal de Cabañas Oeste</h1>
            <p className="text-base text-gray-700 mb-2">Unidad de Informática</p>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sistema de Control de Inventario</h2>
          </motion.div>
        </div>

        {/* Login Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white py-8 px-6 shadow-xl rounded-xl border border-gray-100"
        >
          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            {/* Honeypot fields para engañar el autocompletado del navegador */}
            <input type="text" name="fakeusernameremembered" style={{ display: 'none' }} autoComplete="username" />
            <input type="password" name="fakepasswordremembered" style={{ display: 'none' }} autoComplete="current-password" />
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  id="username" 
                  name="login_user" 
                  type="text" 
                  autoComplete="new-username"
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  placeholder="Ingrese su nombre de usuario"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  id="password" 
                  name="login_pass" 
                  type="password" 
                  autoComplete="new-password"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  placeholder="Ingrese su contraseña"
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-300"></div>
                  ) : (
                    <LogIn className="h-5 w-5 text-blue-300 group-hover:text-blue-200" />
                  )}
                </span>
                {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-gray-500"
        >
          <p>© 2025 Alcaldía Municipal de Cabañas Oeste</p>
          <p>Sistema desarrollado por la Unidad de Informática</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;