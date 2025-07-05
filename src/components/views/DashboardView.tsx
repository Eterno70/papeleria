import React from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/format';
import DatabaseStatus from '../common/DatabaseStatus';

const DashboardView = () => {
  const { articles, movements, getStock, loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalArticles = articles.length;
  const totalValue = articles.reduce((sum, article) => {
    const stock = getStock(article.id);
    return sum + (stock * article.costo);
  }, 0);
  
  const lowStockItems = articles.filter(article => getStock(article.id) <= 5).length;
  const recentMovements = movements.slice(0, 5);

  const statsCards = [
    {
      title: 'Total Artículos',
      value: totalArticles,
      icon: Package,
      color: 'blue',
      trend: '+8.2%'
    },
    {
      title: 'Valor actual del stock',
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: 'green',
      trend: '+12.5%'
    },
    {
      title: 'Stock Bajo',
      value: lowStockItems,
      icon: AlertTriangle,
      color: 'red',
      trend: '-5.2%'
    },
    {
      title: 'Movimientos',
      value: movements.length,
      icon: TrendingUp,
      color: 'purple',
      trend: '+18.1%'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Inventario</h2>
            <p className="text-gray-600">Visualización general del sistema de control de inventario</p>
          </div>
        </div>
        
        <div className="mt-6 rounded-xl overflow-hidden h-40 md:h-64 relative">
          <img 
            src="https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
            alt="Dashboard de gestión de inventario" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 to-transparent flex items-center">
            <div className="px-8 py-6 text-white max-w-lg">
              <h3 className="text-2xl font-bold mb-2 drop-shadow-md">Sistema de Gestión de Inventario</h3>
              <p className="text-white/90 drop-shadow-md">Control total sobre su inventario de papelería y suministros de oficina</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Database Status */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DatabaseStatus />
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600`}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stat.trend}
                </div>
              </div>
              <p className={`text-sm font-medium text-${stat.color}-600 mb-1`}>{stat.title}</p>
              <p className={`text-2xl font-bold text-${stat.color}-800`}>{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Movements */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
      >
        <h3 className="font-semibold text-gray-800 text-lg mb-6">Últimos Movimientos</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 font-medium text-gray-500 text-sm">Fecha</th>
                <th className="pb-3 font-medium text-gray-500 text-sm">Artículo</th>
                <th className="pb-3 font-medium text-gray-500 text-sm">Tipo</th>
                <th className="pb-3 font-medium text-gray-500 text-sm">Cantidad</th>
                <th className="pb-3 font-medium text-gray-500 text-sm">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((movement) => {
                const article = articles.find(a => a.id === movement.id_articulo);
                return (
                  <tr key={movement.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 text-sm text-gray-600">{movement.fecha}</td>
                    <td className="py-4 text-sm font-medium text-gray-900">{article?.nombre || 'Artículo no encontrado'}</td>
                    <td className="py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        movement.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.tipo}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-900">{movement.cantidad} unidades</td>
                    <td className="py-4 text-sm font-medium text-gray-900">{formatCurrency(movement.cantidad * movement.costo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardView;