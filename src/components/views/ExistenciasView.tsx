import React from 'react';
import { motion } from 'framer-motion';
import { Printer, FileDown, Package, AlertTriangle, DollarSign, Filter, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/format';
import { exportExistenciasToCSV, generateHTMLForPDF, downloadHTML, printPage, generateTableHTML } from '../../utils/export';
import toast from 'react-hot-toast';

// Definir función simpleCurrency localmente
const simpleCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

const ExistenciasView = () => {
  const { articles, getStock } = useData();
  const [filters, setFilters] = React.useState({
    articleId: '',
    status: ''
  });

  const getFilteredArticles = () => {
    return articles.filter(article => {
      if (filters.articleId && article.id !== parseInt(filters.articleId)) return false;
      
      const stock = getStock(article.id);
      const totalValue = stock * article.costo;
      
      let status: 'Sin Stock' | 'Stock Bajo' | 'Stock Normal';
      if (stock === 0) {
        status = 'Sin Stock';
      } else if (stock <= 5) {
        status = 'Stock Bajo';
      } else {
        status = 'Stock Normal';
      }
      
      if (filters.status && status !== filters.status) return false;
      return true;
    });
  };

  const filteredArticles = getFilteredArticles();
  const articlesWithStock = filteredArticles.map(article => {
    const stock = getStock(article.id);
    const totalValue = stock * article.costo;
    
    let status: 'Sin Stock' | 'Stock Bajo' | 'Stock Normal';
    if (stock === 0) {
      status = 'Sin Stock';
    } else if (stock <= 5) {
      status = 'Stock Bajo';
    } else {
      status = 'Stock Normal';
    }

    return { article, stock, totalValue, status };
  });

  const totalUnits = articlesWithStock.reduce((sum, item) => sum + item.stock, 0);
  const lowStockItems = articlesWithStock.filter(item => item.stock <= 5).length;
  const totalValue = articlesWithStock.reduce((sum, item) => sum + item.totalValue, 0);

  const clearFilters = () => {
    setFilters({
      articleId: '',
      status: ''
    });
  };

  const handlePrint = () => {
    printPage();
  };

  const handleExportPDF = () => {
    const headers = ['Artículo', 'Stock', 'Costo Unitario', 'Valor Total', 'Estado'];
    const rows = articlesWithStock.map(({ article, stock, totalValue, status }) => [
      article.nombre,
      `${stock} unidades`,
      simpleCurrency(article.costo),
      simpleCurrency(totalValue),
      status
    ]);
    
    const tableHTML = generateTableHTML(headers, rows);
    const htmlContent = generateHTMLForPDF('Control de Existencias', tableHTML, filters);
    
    const filename = `existencias_${new Date().toISOString().split('T')[0]}.html`;
    downloadHTML(htmlContent, filename);
    toast.success('Existencias exportadas a PDF/HTML');
  };

  const handleExportCSV = () => {
    exportExistenciasToCSV(filteredArticles, getStock, filters);
    toast.success('Existencias exportadas a CSV');
  };

  const summaryCards = [
    {
      title: 'Total Unidades',
      value: totalUnits,
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Stock Bajo',
      value: lowStockItems,
      icon: AlertTriangle,
      color: 'red'
    },
    {
      title: 'Valor Total',
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: 'green'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Control de Existencias</h2>
            <p className="text-gray-600">Visualiza el stock de productos por período y artículo</p>
          </div>
        </div>
      </motion.div>

      {/* Filters Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Artículo</label>
            <select 
              value={filters.articleId}
              onChange={(e) => setFilters({ ...filters, articleId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los artículos</option>
              {articles.map(article => (
                <option key={article.id} value={article.id}>{article.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="Sin Stock">Sin Stock</option>
              <option value="Stock Bajo">Stock Bajo</option>
              <option value="Stock Normal">Stock Normal</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Mostrando {filteredArticles.length} de {articles.length} artículos
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            >
              <div className="flex items-center">
                <div className={`p-3 bg-${card.color}-100 rounded-lg mr-4`}>
                  <Icon className={`h-6 w-6 text-${card.color}-600`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Existencias Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">Estado del Inventario</h3>
              <p className="text-sm text-gray-600 mt-1">Stock actual por artículo</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
              >
                <Printer className="h-5 w-5" /> Imprimir
              </button>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
              >
                <FileDown className="h-5 w-5" /> PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 font-medium"
              >
                <FileDown className="h-5 w-5" /> CSV
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Artículo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Stock</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Costo Unitario</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Valor Total</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {articlesWithStock.map(({ article, stock, totalValue, status }) => {
                const statusClass = 
                  status === 'Sin Stock' ? 'bg-red-100 text-red-800' :
                  status === 'Stock Bajo' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800';

                return (
                  <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{article.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{stock} unidades</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(article.costo)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(totalValue)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {articlesWithStock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron artículos que coincidan con los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default ExistenciasView;