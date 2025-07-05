import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import toast from 'react-hot-toast';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movementToEdit?: any;
}

const MovementModal = ({ isOpen, onClose, movementToEdit }: MovementModalProps) => {
  const { articles, addMovement, updateMovement, getStock, movements } = useData();
  const [formData, setFormData] = useState({
    id_articulo: '',
    tipo: '',
    cantidad: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cantidadError, setCantidadError] = useState('');

  // Prellenar si es edición
  React.useEffect(() => {
    if (movementToEdit) {
      setFormData({
        id_articulo: movementToEdit.id_articulo.toString(),
        tipo: movementToEdit.tipo,
        cantidad: movementToEdit.cantidad.toString(),
        fecha: movementToEdit.fecha,
        descripcion: movementToEdit.descripcion
      });
    } else {
      setFormData({
        id_articulo: '',
        tipo: '',
        cantidad: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
      });
    }
  }, [movementToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id_articulo || !formData.tipo || !formData.cantidad || !formData.descripcion) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    const articleId = parseInt(formData.id_articulo);
    const cantidad = parseInt(formData.cantidad);
    
    if (cantidad <= 0) {
      console.log('VALIDACIÓN FALLIDA: cantidad menor o igual a 0');
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    // Validación avanzada de stock
    if (formData.tipo === 'Entrada') {
      // Si es edición, calcular la suma de salidas posteriores a esta entrada
      if (movementToEdit) {
        const salidasPosteriores = movements.filter((m: any) =>
          m.id_articulo === articleId &&
          m.tipo === 'Salida' &&
          new Date(m.fecha) >= new Date(formData.fecha)
        );
        const totalSalidas = salidasPosteriores.reduce((sum: number, m: any) => sum + m.cantidad, 0);
        if (cantidad < totalSalidas) {
          const msg = `No puedes registrar una entrada menor a las salidas ya realizadas (${totalSalidas} unidades).`;
          setCantidadError(msg);
          console.log('VALIDACIÓN FALLIDA: entrada menor a salidas posteriores', msg);
          toast.error(msg);
          return;
        } else {
          setCantidadError('');
        }
      }
    } else if (formData.tipo === 'Salida') {
      // Validar que la suma de salidas no supere el stock disponible
      const entradas = movements.filter((m: any) => m.id_articulo === articleId && m.tipo === 'Entrada');
      const salidas = movements.filter((m: any) => m.id_articulo === articleId && m.tipo === 'Salida' && m.id !== (movementToEdit ? movementToEdit.id : null));
      const totalEntradas = entradas.reduce((sum: number, m: any) => sum + m.cantidad, 0);
      const totalSalidas = salidas.reduce((sum: number, m: any) => sum + m.cantidad, 0);
      if ((totalSalidas + cantidad) > totalEntradas) {
        console.log('VALIDACIÓN FALLIDA: salida mayor al stock disponible', { totalSalidas, cantidad, totalEntradas });
        toast.error('No puedes registrar una salida mayor al stock disponible.');
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const article = articles.find(a => a.id === articleId);
      if (!article) {
        toast.error('Artículo no encontrado');
        return;
      }

      const movementData = {
        id_articulo: articleId,
        tipo: formData.tipo as 'Entrada' | 'Salida',
        cantidad: cantidad,
        fecha: formData.fecha,
        descripcion: formData.descripcion.trim().toUpperCase(),
        costo: article.costo
      };

      if (movementToEdit) {
        await updateMovement(movementToEdit.id, movementData);
      } else {
        await addMovement(movementData);
      }
      
      // Reset form
      setFormData({
        id_articulo: '',
        tipo: '',
        cantidad: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
      });
      
      onClose();
    } catch (error) {
      // Error is handled in context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {movementToEdit ? 'Editar Movimiento' : 'Registrar Movimiento'}
              </h3>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artículo
                </label>
                <select
                  value={formData.id_articulo}
                  onChange={(e) => setFormData({ ...formData, id_articulo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Seleccionar artículo...</option>
                  {articles.map(article => (
                    <option key={article.id} value={article.id}>{article.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Movimiento
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="Entrada">Entrada</option>
                  <option value="Salida">Salida</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo Unitario
                </label>
                <input
                  type="number"
                  value={(() => {
                    const art = articles.find(a => a.id === parseInt(formData.id_articulo));
                    return art ? art.costo : '';
                  })()}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-0 focus:border-gray-300 transition-all"
                  placeholder="Selecciona un artículo"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isLoading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MovementModal;