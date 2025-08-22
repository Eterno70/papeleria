import React from 'react';
import { 
  Home, 
  Package, 
  TrendingUp, 
  FileText, 
  Calendar,
  BarChart3,
  Upload,
  Users
} from 'lucide-react';
import { ViewType } from '../Dashboard';

interface NavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'articles', label: 'Artículos', icon: Package },
  { id: 'movements', label: 'Movimientos', icon: TrendingUp },
  { id: 'existencias', label: 'Existencias', icon: FileText },
  { id: 'control-card', label: 'Tarjeta de Control', icon: Calendar },
  { id: 'papeleria-nueva', label: 'Papelería Nueva', icon: BarChart3 },
  { id: 'import-export', label: 'Importar/Exportar', icon: Upload },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
];

const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-16 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 py-3 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as ViewType)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Navigation;