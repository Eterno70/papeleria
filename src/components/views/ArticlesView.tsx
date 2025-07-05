import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Printer, FileDown, Filter, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/format';
import { exportArticlesToCSV, generateHTMLForPDF, downloadHTML, printPage, generateTableHTML } from '../../utils/export';
import ArticleModal from '../modals/ArticleModal';
import toast from 'react-hot-toast';
import ConfirmDialog from '../common/ConfirmDialog';

const ArticlesView = () => {
  const { articles, getStock, deleteArticle } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    minCost: '',
    maxCost: '',
    stockStatus: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const getStockStatus = (articleId: number): string => {
    const stock = getStock(articleId);
    if (stock === 0) return 'Sin Stock';
    if (stock <= 5) return 'Stock Bajo';
    return 'Stock Normal';
  };

  const filteredArticles = articles.filter(article =>
    article.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filters.minCost === '' || article.costo >= parseFloat(filters.minCost)) &&
    (filters.maxCost === '' || article.costo <= parseFloat(filters.maxCost)) &&
    (filters.stockStatus === '' || getStockStatus(article.id) === filters.stockStatus)
  );

  const handleEdit = (article: any) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingArticle(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const stock = getStock(id);
    if (stock > 0) {
      toast.error(`No se puede eliminar un artículo que tiene existencias. Stock actual: ${stock} unidades`);
      return;
    }
    setConfirmDeleteId(id);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      dateFrom: '',
      dateTo: '',
      minCost: '',
      maxCost: '',
      stockStatus: ''
    });
  };

  const handlePrint = () => {
    printPage();
  };

  // Definir función simpleCurrency localmente
  const simpleCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

  const handleExportPDF = () => {
    const headers = ['ID', 'Artículo', 'Costo Unitario', 'Stock Actual', 'Valor Total'];
    const rows = filteredArticles.map(article => {
      const stock = getStock(article.id);
      const totalValue = stock * article.costo;
      return [
        article.id.toString(),
        article.nombre,
        simpleCurrency(article.costo),
        `${stock} unidades`,
        simpleCurrency(totalValue)
      ];
    });
    
    const tableHTML = generateTableHTML(headers, rows);
    const htmlContent = generateHTMLForPDF('Gestión de Artículos', tableHTML, {
      description: searchTerm,
      ...filters
    });
    
    const filename = `articulos_${new Date().toISOString().split('T')[0]}.html`;
    downloadHTML(htmlContent, filename);
    toast.success('Artículos exportados a PDF/HTML');
  };

  const handleExportCSV = () => {
    exportArticlesToCSV(filteredArticles, getStock, {
      description: searchTerm,
      ...filters
    });
    toast.success('Artículos exportados a CSV');
  };

  // Obtener el artículo y su stock para el mensaje de advertencia
  const articleToDelete = confirmDeleteId !== null ? articles.find((a: any) => a.id === confirmDeleteId) : null;
  const stockToDelete = articleToDelete ? getStock(articleToDelete.id) : null;

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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Artículos</h2>
            <p className="text-gray-600">Administra el catálogo de productos del inventario</p>
          </div>
          <button 
            onClick={handleAdd}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-4 w-4" />
            Nuevo Artículo
          </button>
        </div>
      </motion.div>
      
      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar artículo por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex justify-end w-full md:w-auto">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Limpiar filtro
            </button>
          </div>
        </div>
      </motion.div>

      {/* Articles Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">Lista de Artículos</h3>
              <p className="text-sm text-gray-600 mt-1">Gestiona todos los artículos del inventario</p>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Artículo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Costo Unitario</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Stock Actual</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Valor Total</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay artículos registrados
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article: any) => {
                  const stock = getStock(article.id);
                  const totalValue = stock * article.costo;
                  return (
                    <tr key={article.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{article.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{article.nombre}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(article.costo)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          stock === 0 ? 'bg-red-100 text-red-800' :
                          stock < 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {stock} unidades
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(totalValue)}</td>
                      <td className="px-6 py-4 text-center no-print">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(article)}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Editar artículo"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(article.id)}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Eliminar artículo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Filtros Avanzados</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Mínimo</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={filters.minCost}
                  onChange={(e) => setFilters({ ...filters, minCost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Costo Máximo</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={filters.maxCost}
                  onChange={(e) => setFilters({ ...filters, maxCost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="999.99"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Stock</label>
                <select
                  value={filters.stockStatus}
                  onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="Sin Stock">Sin Stock</option>
                  <option value="Stock Normal">Stock Normal</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  CSV
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId !== null) {
            try {
              await deleteArticle(confirmDeleteId);
              setConfirmDeleteId(null);
            } catch (error) {
              // Error is handled in context
            }
          }
        }}
        title="¡Advertencia de Eliminación!"
        message={
          stockToDelete === 0
            ? '¿Estás seguro de que deseas eliminar este artículo? Esta acción es irreversible.'
            : 'Si eliminas este artículo, también se eliminarán TODAS las entradas y salidas asociadas a él. Esta acción es irreversible. ¿Deseas continuar?'
        }
        confirmText="Sí, eliminar todo"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Article Modal */}
      <ArticleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        article={editingArticle}
      />
    </div>
  );
};

export default ArticlesView;