import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter, Printer, FileDown, X, Pencil, Trash } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/format';
import { exportMovementsToCSV, generateHTMLForPDF, downloadHTML, printPage, generateTableHTML } from '../../utils/export';
import MovementModal from '../modals/MovementModal';
import toast from 'react-hot-toast';

const MovementsView = () => {
  const { movements, articles, deleteMovement, actualizarCostosMovimientos } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    articleId: '',
    type: '',
    month: '',
    year: '',
    description: ''
  });
  // 1. Agregar estado para el movimiento a editar
  const [movementToEdit, setMovementToEdit] = useState<any | null>(null);

  const filteredMovements = movements.filter(movement => {
    const article = articles.find(a => a.id === movement.id_articulo);
    
    if (filters.articleId && movement.id_articulo !== parseInt(filters.articleId)) return false;
    if (filters.type && movement.tipo !== filters.type) return false;
    // Filtrado por mes y año
    if (filters.month && filters.year && movement.fecha) {
      const fecha = new Date(movement.fecha);
      if (
        fecha.getMonth() + 1 !== parseInt(filters.month) ||
        fecha.getFullYear() !== parseInt(filters.year)
      ) return false;
    }
    if (filters.description && !movement.descripcion.toLowerCase().includes(filters.description.toLowerCase())) return false;
    
    return true;
  });

  const getArticleName = (id: number): string => {
    const article = articles.find(a => a.id === id);
    return article ? article.nombre : 'Artículo no encontrado';
  };

  const clearFilters = () => {
    setFilters({
      articleId: '',
      type: '',
      month: '',
      year: '',
      description: ''
    });
  };

  const handlePrint = () => {
    printPage();
  };

  // Definir función simpleCurrency localmente
  const simpleCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

  const handleExportPDF = () => {
    const headers = ['Fecha', 'Artículo', 'Tipo', 'Cantidad', 'Costo', 'Descripción', 'Valor Total'];
    const rows = filteredMovements.map(movement => [
      movement.fecha,
      getArticleName(movement.id_articulo),
      movement.tipo,
      movement.cantidad.toString(),
      simpleCurrency(movement.costo),
      movement.descripcion || '',
      simpleCurrency(movement.cantidad * movement.costo)
    ]);
    
    const tableHTML = generateTableHTML(headers, rows);
    const htmlContent = generateHTMLForPDF('Movimientos de Inventario', tableHTML, filters);
    
    const filename = `movimientos_${new Date().toISOString().split('T')[0]}.html`;
    downloadHTML(htmlContent, filename);
    toast.success('Movimientos exportados a PDF/HTML');
  };

  const handleExportCSV = () => {
    exportMovementsToCSV(filteredMovements, getArticleName, filters);
    toast.success('Movimientos exportados a CSV');
  };

  const handleDeleteMovement = async (movement: any) => {
    const articleName = getArticleName(movement.id_articulo);
    // Solo aplicar la validación si es una entrada
    if (movement.tipo === 'Entrada') {
      // Buscar salidas posteriores a esta entrada para el mismo artículo
      const salidaPosterior = movements.some(m =>
        m.id_articulo === movement.id_articulo &&
        m.tipo === 'Salida' &&
        new Date(m.fecha) >= new Date(movement.fecha)
      );
      if (salidaPosterior) {
        toast.error('No se puede eliminar esta entrada porque existen salidas asociadas posteriores. Solo puede editarse.');
        return;
      }
    }
    if (window.confirm(`¿Seguro que deseas eliminar el movimiento de "${articleName}"?`)) {
      try {
        await deleteMovement(movement.id);
        // La lista se actualizará automáticamente por el contexto
      } catch (error) {
        // El contexto ya muestra el toast de error
      }
    }
  };

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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Movimientos de Inventario</h2>
            <p className="text-gray-600">Registra entradas y salidas de productos</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-4 w-4" />
            Nuevo Movimiento
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
      >
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
            <select 
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="Entrada">Entrada</option>
              <option value="Salida">Salida</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
            <select
              value={filters.month}
              onChange={e => setFilters({ ...filters, month: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los meses</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
            <select
              value={filters.year}
              onChange={e => setFilters({ ...filters, year: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los años</option>
              {(() => {
                const currentYear = new Date().getFullYear();
                const years = [];
                for (let year = 2023; year <= currentYear; year++) {
                  years.push(<option key={year} value={year}>{year}</option>);
                }
                return years;
              })()}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <input 
              type="text" 
              placeholder="Buscar en descripción..."
              value={filters.description}
              onChange={(e) => setFilters({ ...filters, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
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
            Mostrando {filteredMovements.length} de {movements.length} movimientos
          </div>
        </div>
      </motion.div>

      {/* Movements Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">Historial de Movimientos</h3>
              <p className="text-sm text-gray-600 mt-1">Registro filtrado de entradas y salidas</p>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[130px]">Fecha</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Artículo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cantidad</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Costo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Descripción</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMovements.map((movement) => {
                return (
                  <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 min-w-[130px]">{movement.fecha}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{getArticleName(movement.id_articulo)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        movement.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{movement.cantidad}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(movement.costo)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{movement.descripcion}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(movement.cantidad * movement.costo)}</td>
                    <td className="px-6 py-4 text-center no-print flex gap-2 justify-center">
                      <button
                        className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 transition-colors"
                        title="Editar"
                        onClick={() => { setMovementToEdit(movement); setIsModalOpen(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                        title="Eliminar"
                        onClick={() => handleDeleteMovement(movement)}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron movimientos que coincidan con los filtros aplicados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Movement Modal */}
      <MovementModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setMovementToEdit(null); }}
        movementToEdit={movementToEdit}
      />
    </div>
  );
};

export default MovementsView;