import React from 'react';
import { Layers, Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import ProfileModal from '../modals/ProfileModal';

const Header = () => {
  const { user, logout } = useAuth();
  const { articles, getStock } = useData();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);

  // Persistencia de notificaciones gestionadas
  const NOTIF_KEY = 'notificaciones_gestionadas';
  const [notificacionesGestionadas, setNotificacionesGestionadas] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // Notificaciones: artículos con stock bajo
  const lowStockArticles = articles.filter(a => getStock(a.id) > 0 && getStock(a.id) <= 5);
  const notifications = [
    ...lowStockArticles.map(a => ({
      id: `stock-${a.id}`,
      type: 'stock',
      message: `Stock bajo: ${a.nombre} (${getStock(a.id)} unidades)`,
      articleId: a.id
    }))
    // Aquí puedes agregar más notificaciones (tareas, mensajes, etc.)
  ];
  // Filtrar notificaciones no gestionadas
  const pendingNotifications = notifications.filter(n => !notificacionesGestionadas.includes(n.id));
  const hasNotifications = pendingNotifications.length > 0;

  // Marcar como gestionada
  const handleMarkAsManaged = (notifId: string) => {
    const nuevas = [...notificacionesGestionadas, notifId];
    setNotificacionesGestionadas(nuevas);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(nuevas));
  };

  // Dar seguimiento (ir al artículo)
  const handleFollow = (notif: any) => {
    if (notif.type === 'stock' && notif.articleId) {
      // Redirigir a la vista de artículos y buscar el artículo
      navigate('/articulos', { state: { search: notif.message.split(': ')[1].split(' (')[0] } });
    }
    handleMarkAsManaged(notif.id);
    setShowNotifications(false);
  };

  // Marcar como leída (sin seguimiento)
  const handleMarkAsRead = (notif: any) => {
    handleMarkAsManaged(notif.id);
  };

  // Cerrar menús al hacer clic fuera
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      setShowNotifications(false);
      setShowUserMenu(false);
    };
    if (showNotifications || showUserMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showNotifications, showUserMenu]);

  // Al iniciar sesión, recargar notificaciones gestionadas
  React.useEffect(() => {
    setNotificacionesGestionadas(() => {
      try {
        return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
      } catch {
        return [];
      }
    });
  }, [user?.id]);
  
  const currentDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const userInitials = user?.username.slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-lg">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Control de Inventario</h1>
              <p className="text-sm text-gray-600 mt-0.5">Gestión profesional de inventarios</p>
            </div>
            <div className="block md:hidden">
              <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
            </div>
          </div>
          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en el sistema..."
                className="w-48 pl-9 pr-4 py-2 bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
              />
            </div>
            {/* Notification Bell */}
            <div className="relative">
              <button
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={e => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
              >
              <Bell className="h-5 w-5 text-gray-600" />
                {hasNotifications && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-blue-600 rounded-full"></span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b font-semibold text-gray-700 flex justify-between items-center">
                    <span>Notificaciones</span>
                    {pendingNotifications.length > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          // Marcar todas como gestionadas
                          const todas = [
                            ...notificacionesGestionadas,
                            ...pendingNotifications.map(n => n.id)
                          ];
                          setNotificacionesGestionadas(todas);
                          localStorage.setItem(NOTIF_KEY, JSON.stringify(todas));
                        }}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Marcar todas
                      </button>
                    )}
                  </div>
                  {pendingNotifications.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm">No hay notificaciones</div>
                  ) : (
                    pendingNotifications.map((n, i) => (
                      <div key={i} className="p-4 text-gray-700 text-sm border-b last:border-b-0 flex flex-col gap-2">
                        <span>{n.message}</span>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={e => { e.stopPropagation(); handleMarkAsRead(n); }}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                          >
                            Marcar como leída
            </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* Organization Info */}
            <div className="hidden md:block text-right">
              <div className="text-sm font-medium text-gray-900">Alcaldía Municipal de Cabañas Oeste</div>
              <div className="text-xs text-gray-500 mt-0.5 capitalize">{currentDate}</div>
            </div>
            {/* User Avatar and Menu */}
            <div className="relative flex items-center gap-3">
              <button
                className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium shadow-md focus:outline-none"
                onClick={e => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
              >
                <span>{userInitials}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-12 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b font-semibold text-gray-700">Perfil</div>
                  <div className="p-4 text-gray-700 text-sm border-b">{user?.username || 'Usuario'}</div>
                  <button
                    onClick={() => { setShowProfile(true); setShowUserMenu(false); }}
                    className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-100 font-medium flex items-center gap-2"
                  >
                    Ver perfil
                  </button>
              <button 
                onClick={logout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-100 rounded-b-lg font-medium flex items-center gap-2"
              >
                    <LogOut className="h-4 w-4" /> Cerrar Sesión
              </button>
                </div>
              )}
              <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;