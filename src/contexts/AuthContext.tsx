import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseClient } from '../lib/supabase';
import toast from 'react-hot-toast';
import bcrypt from 'bcryptjs';

interface User {
  id: string;
  username: string;
  role: string;
  full_name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage (temporary fallback)
    const storedUser = localStorage.getItem('currentUser');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (isLoggedIn === 'true' && storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Buscar usuario en Supabase
      const { data: userData, error: userError } = await supabaseClient
        .from('usuarios')
        .select('id, username, role, full_name, email, active, password_hash')
        .eq('username', username)
        .eq('active', true)
        .single();

      if (userError || !userData) {
        console.error('Usuario no encontrado:', userError);
        toast.error('Usuario o contraseña incorrectos');
        return false;
      }

      // Verificar contraseña en cliente con bcryptjs (evita incompatibilidades de pgcrypto)
      const passwordCheck = await bcrypt.compare(password, userData.password_hash);
      if (!passwordCheck) {
        toast.error('Usuario o contraseña incorrectos');
        return false;
      }

      // Actualizar último login
      await supabaseClient
        .from('usuarios')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id);

      const userSession = {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        full_name: userData.full_name,
        email: userData.email
      };
      
      setUser(userSession);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', JSON.stringify(userSession));
      
      toast.success(`Bienvenido, ${userData.full_name || userData.username}`);
      return true;

    } catch (error) {
      console.error('Error durante el login:', error);
      toast.error('Error durante el inicio de sesión');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    toast.success('Sesión cerrada correctamente');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };