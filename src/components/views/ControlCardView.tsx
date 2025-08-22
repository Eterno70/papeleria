import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, FileDown, Calendar, Pencil, Trash } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { generateHTMLForPDF, downloadHTML, generateTableHTML } from '../../utils/export';
import toast from 'react-hot-toast';
import ReactModal from 'react-modal';

const ControlCardView = () => {
  const { articles, movements, updateMovement, deleteMovement, refreshData } = useData();
  const [selectedArticle, setSelectedArticle] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [controlCardData, setControlCardData] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    description: ''
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMovement, setEditMovement] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, movement: any}|null>(null);

  useEffect(() => {
    generateControlCard();
  }, [selectedArticle, selectedMonth, selectedYear, articles, movements]);

  const generateControlCard = () => {
    let filteredMovements = movements;
    let article = null;
    if (selectedArticle) {
      article = articles.find(a => a.id === parseInt(selectedArticle));
      filteredMovements = filteredMovements.filter(m => m.id_articulo === parseInt(selectedArticle));
    }
    // Calcular saldo inicial antes del mes/año filtrado
    let initialBalances: Record<number, number> = {};
    let initialCosts: Record<number, number> = {};
    if (selectedMonth || selectedYear) {
      // Calcular saldo inicial y último costo de entrada previo para cada artículo
      articles.forEach(art => {
        const prevMovements = movements.filter(movement => {
          if (movement.id_articulo !== art.id) return false;
          const [year, month] = movement.fecha.split('-');
          const isBeforeYear = selectedYear && year < selectedYear;
          const isSameYearBeforeMonth = selectedYear && year === selectedYear && selectedMonth && month < selectedMonth.padStart(2, '0');
          return isBeforeYear || isSameYearBeforeMonth;
        });
        let saldo = 0;
        let lastCost = art.costo;
        prevMovements.forEach(movement => {
          if (movement.tipo === 'Entrada') {
            saldo += movement.cantidad;
            if (movement.costo > 0) lastCost = movement.costo;
          } else {
            saldo -= movement.cantidad;
          }
        });
        initialBalances[art.id] = saldo;
        initialCosts[art.id] = lastCost;
      });
    }
    if (selectedMonth || selectedYear) {
      filteredMovements = filteredMovements.filter(movement => {
        const [year, month] = movement.fecha.split('-');
        const monthMatch = !selectedMonth || month === selectedMonth.padStart(2, '0');
        const yearMatch = !selectedYear || year === selectedYear;
        return monthMatch && yearMatch;
      });
    }
    filteredMovements.sort((a, b) => {
      const dateA = a.fecha;
      const dateB = b.fecha;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      if (a.tipo === b.tipo) return 0;
      return a.tipo === 'Entrada' ? -1 : 1;
    });
    let runningBalances: Record<number, number> = { ...initialBalances };
    let runningCosts: Record<number, number> = { ...initialCosts };
    const cardData = filteredMovements.map(movement => {
      let art = article;
      if (!art) art = articles.find(a => a.id === movement.id_articulo);
      if (!art) return null;
      if (runningBalances[art.id] === undefined) runningBalances[art.id] = 0;
      if (runningCosts[art.id] === undefined) runningCosts[art.id] = art.costo;
      if (movement.tipo === 'Entrada') {
        runningBalances[art.id] += movement.cantidad;
        if (movement.costo > 0) runningCosts[art.id] = movement.costo;
      } else {
        runningBalances[art.id] -= movement.cantidad;
      }
      return {
        ...movement,
        article: art,
        balance: runningBalances[art.id],
        costoUnit: runningCosts[art.id],
        totalValue: movement.cantidad * (movement.costo > 0 ? movement.costo : runningCosts[art.id]),
        balanceValue: runningBalances[art.id] * runningCosts[art.id]
      };
    }).filter(Boolean);
    // Agregar fila de saldo inicial si hay filtro de mes/año
    let saldoInicialRow = null;
    if ((selectedMonth || selectedYear) && selectedArticle) {
      const art = articles.find(a => a.id === parseInt(selectedArticle));
      if (art) {
        saldoInicialRow = {
          fecha: '',
          descripcion: 'Saldo Inicial',
          tipo: '',
          cantidad: '',
          costo: '',
          article: art,
          balance: initialBalances[art.id],
          costoUnit: initialCosts[art.id],
          totalValue: '',
          balanceValue: initialBalances[art.id] * initialCosts[art.id]
      };
      }
    }
    setControlCardData(saldoInicialRow ? [saldoInicialRow, ...cardData] : cardData);
  };

  // (Se retiró clearFilters para evitar warning de no uso)

  // Helper para imprimir HTML generado en nueva pestaña
  const openAndPrint = (html: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Pequeño delay para asegurar que el contenido cargue antes de imprimir
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePrint = () => {
    // Si hay artículo seleccionado, usamos el contenido específico existente
    if (selectedArticle) {
      const html = generatePrintableContent();
      openAndPrint(html);
      return;
    }

    // Si NO hay artículo seleccionado, generamos impresión para TODOS los artículos
    if (!articles || articles.length === 0) {
      toast.error('No hay artículos disponibles para imprimir');
      return;
    }

    // Agrupar datos por artículo usando los datos ya calculados en controlCardData
    const grouped: Record<number, any[]> = {};
    controlCardData.forEach((item: any) => {
      const artId = item.article?.id ?? item.id_articulo;
      if (!grouped[artId]) grouped[artId] = [];
      grouped[artId].push(item);
    });

    const sections = Object.keys(grouped)
      .map(idStr => parseInt(idStr))
      .sort((a, b) => a - b)
      .map(artId => {
        const art = articles.find(a => a.id === artId);
        if (!art) return '';
        const headers = ['Fecha', 'Descripción', 'Entrada Cant.', 'Entrada Costo', 'Entrada Total', 'Salida Cant.', 'Salida Costo', 'Salida Total', 'Existencia', 'Costo Unit.', 'Total'];
        const rows = grouped[artId].map((item: any) => {
          const isEntry = item.tipo === 'Entrada';
          const totalValue = item.cantidad * (item.costo > 0 ? item.costo : item.costoUnit);
          const existenceValue = item.balance * item.costoUnit;
          return [
            item.fecha,
            item.descripcion,
            isEntry ? item.cantidad.toString() : '0',
            isEntry ? formatCurrency(item.costo) : formatCurrency(0),
            isEntry ? formatCurrency(totalValue) : formatCurrency(0),
            !isEntry ? item.cantidad.toString() : '0',
            !isEntry ? formatCurrency(item.costo) : formatCurrency(0),
            !isEntry ? formatCurrency(totalValue) : formatCurrency(0),
            item.balance.toString(),
            formatCurrency(item.costoUnit),
            formatCurrency(existenceValue)
          ];
        });
        const table = generateTableHTML(headers, rows);
        return `
          <div style="margin-top:12px; font-size:12px; font-weight:bold;">Artículo: ${art.nombre}</div>
          ${table}
        `;
      })
      .join('\n');

    const htmlContent = generateHTMLForPDF('Tarjeta de Control - Todos los artículos', sections, {
      articleId: '',
      dateFrom: selectedMonth && selectedYear ? `${selectedYear}-${selectedMonth}-01` : '',
      dateTo: selectedMonth && selectedYear ? `${selectedYear}-${selectedMonth}-31` : '',
      ...filters
    });

    openAndPrint(htmlContent);
  };

  const handleExportPDF = () => {
    // Exportación por artículo (comportamiento existente)
    if (selectedArticle) {
      const article = articles.find(a => a.id === parseInt(selectedArticle));
      if (!article) return;

      const headers = ['Fecha', 'Descripción', 'Entrada Cant.', 'Entrada Costo', 'Entrada Total', 'Salida Cant.', 'Salida Costo', 'Salida Total', 'Existencia', 'Costo Unit.', 'Total'];
      const rows = controlCardData.map(item => {
        const isEntry = item.tipo === 'Entrada';
        const totalValue = item.cantidad * (item.costo > 0 ? item.costo : item.costoUnit);
        const existenceValue = item.balance * item.costoUnit;
        
        return [
          item.fecha,
          item.descripcion,
          isEntry ? item.cantidad.toString() : '0',
          isEntry ? formatCurrency(item.costo) : formatCurrency(0),
          isEntry ? formatCurrency(totalValue) : formatCurrency(0),
          !isEntry ? item.cantidad.toString() : '0',
          !isEntry ? formatCurrency(item.costo) : formatCurrency(0),
          !isEntry ? formatCurrency(totalValue) : formatCurrency(0),
          item.balance.toString(),
          formatCurrency(item.costoUnit),
          formatCurrency(existenceValue)
        ];
      });
      
      const tableHTML = generateTableHTML(headers, rows);
      const htmlContent = generateHTMLForPDF(`Tarjeta de Control - ${article.nombre}`, tableHTML, {
        articleId: selectedArticle,
        dateFrom: selectedMonth && selectedYear ? `${selectedYear}-${selectedMonth}-01` : '',
        dateTo: selectedMonth && selectedYear ? `${selectedYear}-${selectedMonth}-31` : '',
        ...filters
      });
      
      const filename = `tarjeta_control_${article.nombre.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.html`;
      downloadHTML(htmlContent, filename);
      toast.success('Tarjeta de control exportada a PDF/HTML');
      return;
    }

    // Exportación para TODOS los artículos (sin selección)
    if (!articles || articles.length === 0) {
      toast.error('No hay artículos para exportar');
      return;
    }

    const grouped: Record<number, any[]> = {};
    controlCardData.forEach((item: any) => {
      const artId = item.article?.id ?? item.id_articulo;
      if (!grouped[artId]) grouped[artId] = [];
      grouped[artId].push(item);
    });

    const sections = Object.keys(grouped)
      .map(idStr => parseInt(idStr))
      .sort((a, b) => a - b)
      .map(artId => {
        const art = articles.find(a => a.id === artId);
        if (!art) return '';
        const headers = ['Fecha', 'Descripción', 'Entrada Cant.', 'Entrada Costo', 'Entrada Total', 'Salida Cant.', 'Salida Costo', 'Salida Total', 'Existencia', 'Costo Unit.', 'Total'];
        const rows = grouped[artId].map((item: any) => {
          const isEntry = item.tipo === 'Entrada';
          const totalValue = item.cantidad * (item.costo > 0 ? item.costo : item.costoUnit);
          const existenceValue = item.balance * item.costoUnit;
          return [
            item.fecha,
            item.descripcion,
            isEntry ? item.cantidad.toString() : '0',
            isEntry ? formatCurrency(item.costo) : formatCurrency(0),
            isEntry ? formatCurrency(totalValue) : formatCurrency(0),
            !isEntry ? item.cantidad.toString() : '0',
            !isEntry ? formatCurrency(item.costo) : formatCurrency(0),
            !isEntry ? formatCurrency(totalValue) : formatCurrency(0),
            item.balance.toString(),
            formatCurrency(item.costoUnit),
            formatCurrency(existenceValue)
          ];
        });
        const table = generateTableHTML(headers, rows);
        return `
          <div style=\"margin-top:12px; font-size:12px; font-weight:bold;\">Artículo: ${art.nombre}</div>
          ${table}
        `;
      })
      .join('\n');

    const htmlContent = generateHTMLForPDF('Tarjeta de Control - Todos los artículos', sections, {
      articleId: '',
      dateFrom: selectedMonth && selectedYear ? `${selectedYear}-${selectedMonth}-01` : '',
      dateTo: selectedMonth && selectedYear ? `${selectedYear}-${selectedMonth}-31` : '',
      ...filters
    });

    const filename = `tarjeta_control_todos_${new Date().toISOString().split('T')[0]}.html`;
    downloadHTML(htmlContent, filename);
    toast.success('Tarjeta de control (todos los artículos) exportada a PDF/HTML');
  };

  // Definir función simpleCurrency localmente
  const simpleCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

  const handleExportCSV = () => {
    // CSV por artículo
    if (selectedArticle) {
      const article = articles.find(a => a.id === parseInt(selectedArticle));
      if (!article) return;
      const headers = ['Fecha', 'Descripción', 'Entrada Cant.', 'Entrada Costo', 'Entrada Total', 'Salida Cant.', 'Salida Costo', 'Salida Total', 'Existencia', 'Costo Unit.', 'Total'];
      const rows = controlCardData.map(item => {
        const isEntry = item.tipo === 'Entrada';
        const totalValue = item.cantidad * (item.costo > 0 ? item.costo : item.costoUnit);
        const existenceValue = item.balance * item.costoUnit;
        return [
          item.fecha,
          item.descripcion,
          isEntry ? item.cantidad.toString() : '0',
          isEntry ? simpleCurrency(item.costo) : simpleCurrency(0),
          isEntry ? simpleCurrency(totalValue) : simpleCurrency(0),
          !isEntry ? item.cantidad.toString() : '0',
          !isEntry ? simpleCurrency(item.costo) : simpleCurrency(0),
          !isEntry ? simpleCurrency(totalValue) : simpleCurrency(0),
          item.balance.toString(),
          simpleCurrency(item.costoUnit),
          simpleCurrency(existenceValue)
        ];
      });
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `tarjeta_control_${article.nombre.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Tarjeta de control exportada a CSV');
      return;
    }

    // CSV para TODOS los artículos
    if (!articles || articles.length === 0) {
      toast.error('No hay artículos para exportar');
      return;
    }
    const grouped: Record<number, any[]> = {};
    controlCardData.forEach((item: any) => {
      const artId = item.article?.id ?? item.id_articulo;
      if (!grouped[artId]) grouped[artId] = [];
      grouped[artId].push(item);
    });

    const headers = ['Fecha', 'Descripción', 'Entrada Cant.', 'Entrada Costo', 'Entrada Total', 'Salida Cant.', 'Salida Costo', 'Salida Total', 'Existencia', 'Costo Unit.', 'Total'];
    const parts: string[] = [];
    Object.keys(grouped)
      .map(idStr => parseInt(idStr))
      .sort((a, b) => a - b)
      .forEach(artId => {
        const art = articles.find(a => a.id === artId);
        if (!art) return;
        parts.push(`"Artículo: ${art.nombre}"`);
        parts.push(headers.join(','));
        grouped[artId].forEach((item: any) => {
          const isEntry = item.tipo === 'Entrada';
          const totalValue = item.cantidad * (item.costo > 0 ? item.costo : item.costoUnit);
          const existenceValue = item.balance * item.costoUnit;
          const row = [
            item.fecha,
            item.descripcion,
            isEntry ? item.cantidad.toString() : '0',
            isEntry ? simpleCurrency(item.costo) : simpleCurrency(0),
            isEntry ? simpleCurrency(totalValue) : simpleCurrency(0),
            !isEntry ? item.cantidad.toString() : '0',
            !isEntry ? simpleCurrency(item.costo) : simpleCurrency(0),
            !isEntry ? simpleCurrency(totalValue) : simpleCurrency(0),
            item.balance.toString(),
            simpleCurrency(item.costoUnit),
            simpleCurrency(existenceValue)
          ];
          parts.push(row.map(cell => `"${cell}"`).join(','));
        });
        // Línea en blanco entre artículos
        parts.push('');
      });

    const csvContent = parts.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tarjeta_control_todos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Tarjeta de control (todos los artículos) exportada a CSV');
  };

  const printControlCard = () => {
    handlePrint();
  };

  const exportToPDF = () => {
    handleExportPDF();
  };

  const generatePrintableContent = () => {
    const article = articles.find(a => a.id === parseInt(selectedArticle));
    const currentDate = new Date().toLocaleDateString('es-ES');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tarjeta de Control - ${article?.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px; }
          th { background-color: #f0f0f0; }
          .header { text-align: center; margin-bottom: 20px; }
          .article-info { margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TARJETA DE CONTROL</h1>
          <p>Alcaldía Municipal de Cabañas Oeste</p>
          <p>Fecha: ${currentDate}</p>
        </div>
        <div class="article-info">
          <strong>Artículo:</strong> ${article?.nombre}<br>
          <strong>Costo Unitario:</strong> ${formatCurrency(article?.costo || 0)}
        </div>
        <table>
          <thead>
            <tr>
              <th rowspan="2">Fecha</th>
              <th rowspan="2">Descripción</th>
              <th colspan="3">ENTRADA</th>
              <th colspan="3">SALIDA</th>
              <th colspan="3">EXISTENCIA</th>
            </tr>
            <tr>
              <th>Cantidad</th>
              <th>Costo Unit.</th>
              <th>Total</th>
              <th>Cantidad</th>
              <th>Costo Unit.</th>
              <th>Total</th>
              <th>Cantidad</th>
              <th>Costo Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${controlCardData.map(item => `
              <tr>
                <td>${item.fecha}</td>
                <td>${item.descripcion}</td>
                <td>${item.tipo === 'Entrada' ? item.cantidad : ''}</td>
                <td>${item.tipo === 'Entrada' ? formatCurrency(item.costo) : ''}</td>
                <td>${item.tipo === 'Entrada' ? formatCurrency(item.totalValue) : ''}</td>
                <td>${item.tipo === 'Salida' ? item.cantidad : ''}</td>
                <td>${item.tipo === 'Salida' ? formatCurrency(item.costo) : ''}</td>
                <td>${item.tipo === 'Salida' ? formatCurrency(item.totalValue) : ''}</td>
                <td>${item.balance}</td>
                <td>${formatCurrency(article?.costo || 0)}</td>
                <td>${formatCurrency(item.balanceValue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-8">
      {/* Advertencia si se filtra por mes pero no por año */}
      {(selectedMonth && !selectedYear) && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4 text-yellow-800 font-semibold">
          ⚠️ Por favor, selecciona también un año para filtrar por mes. Filtrar solo por mes puede mostrar datos incongruentes.
        </div>
      )}
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Tarjeta de Control</h2>
            <p className="text-gray-600">Historial detallado de movimientos por artículo</p>
          </div>
          <Calendar className="h-12 w-12 text-blue-600" />
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex flex-col flex-1 min-w-[180px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Artículo</label>
                <select 
                  value={selectedArticle}
                  onChange={(e) => setSelectedArticle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los artículos</option>
                  {articles.map(article => (
                    <option key={article.id} value={article.id}>{article.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
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
              <div className="flex flex-col flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los años</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <div className="flex flex-col flex-1 min-w-[220px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <input
                  type="text"
                  value={filters.description}
                  onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Buscar en descripción..."
                />
              </div>
            </div>
            <div className="flex justify-end mt-2 md:mt-0">
              <button
                onClick={() => {
                  setSelectedArticle('');
                  setSelectedMonth('');
                  setSelectedYear('');
                  setFilters({ description: '' });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
          <div className="flex flex-row gap-2 justify-end mt-2">
            <button 
              onClick={printControlCard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button 
              onClick={exportToPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </button>
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </motion.div>

      {/* Control Card Table */}
      {(selectedArticle || !selectedArticle) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 text-lg">
              Tarjeta de Control - {articles.find(a => a.id === parseInt(selectedArticle))?.nombre || 'Todos los artículos'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Mostrando {controlCardData.length} movimientos
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th rowSpan={2} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r">Fecha</th>
                  <th rowSpan={2} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r">Descripción</th>
                  <th colSpan={3} className="px-4 py-2 text-center text-sm font-semibold text-gray-900 border-r bg-green-50">ENTRADA</th>
                  <th colSpan={3} className="px-4 py-2 text-center text-sm font-semibold text-gray-900 border-r bg-red-50">SALIDA</th>
                  <th colSpan={3} className="px-4 py-2 text-center text-sm font-semibold text-gray-900 bg-blue-50">EXISTENCIA</th>
                </tr>
                <tr>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Cantidad</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Costo Unit.</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Total</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Cantidad</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Costo Unit.</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Total</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Cantidad</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-r">Costo Unit.</th>
                  <th className="px-2 py-2 text-center text-xs font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {controlCardData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      No hay movimientos registrados para este artículo en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  controlCardData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 border-r">{formatDate(item.fecha)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r">{item.descripcion}</td>
                      <td className="px-2 py-3 text-center text-sm text-gray-900 border-r">
                        {item.tipo === 'Entrada' ? item.cantidad : ''}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-600 border-r">
                        {item.tipo === 'Entrada' ? formatCurrency(item.costo) : ''}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-600 border-r">
                        {item.tipo === 'Entrada' ? formatCurrency(item.totalValue) : ''}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-900 border-r">
                        {item.tipo === 'Salida' ? item.cantidad : ''}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-600 border-r">
                        {item.tipo === 'Salida' ? formatCurrency(item.costo) : ''}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-600 border-r">
                        {item.tipo === 'Salida' ? formatCurrency(item.totalValue) : ''}
                      </td>
                      <td className="px-2 py-3 text-center text-sm font-medium text-gray-900 border-r">
                        {item.balance}
                      </td>
                      <td className="px-2 py-3 text-center text-sm text-gray-600 border-r">
                        {formatCurrency(item.costoUnit)}
                      </td>
                      <td className="px-2 py-3 text-center text-sm font-medium text-gray-900">
                        {formatCurrency(item.balanceValue)}
                      </td>
                      <td className="px-2 py-3 text-center text-sm">
                        <div className="flex gap-2 justify-center">
                          <button
                            className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                            title="Editar"
                            onClick={() => { 
                              const originalMovement = movements.find(m => m.id === item.id);
                              setEditMovement(originalMovement); 
                              setEditModalOpen(true); 
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                            title="Eliminar"
                            onClick={() => setDeleteConfirm({open: true, movement: item})}
                            disabled={deleteLoading}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modal de edición */}
      <ReactModal
        isOpen={editModalOpen}
        onRequestClose={() => setEditModalOpen(false)}
        className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 max-w-lg mx-auto mt-20 outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        ariaHideApp={false}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Editar movimiento</h2>
        {editMovement && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setEditLoading(true);
              try {
                await updateMovement(editMovement.id, {
                  cantidad: Number(editMovement.cantidad),
                  fecha: editMovement.fecha,
                  descripcion: editMovement.descripcion,
                  costo: Number(editMovement.costo)
                });
                toast.success('Movimiento actualizado correctamente');
                setEditModalOpen(false);
                setEditMovement(null);
                refreshData();
              } catch (err) {
                toast.error('Error al actualizar movimiento');
              } finally {
                setEditLoading(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Cantidad</label>
              <input type="number" value={editMovement.cantidad} min={1} required
                onChange={e => setEditMovement({...editMovement, cantidad: e.target.value})}
                className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha</label>
              <input 
                type="date" 
                value={editMovement.fecha ? editMovement.fecha.slice(0,10) : ''} 
                required
                onChange={e => setEditMovement({...editMovement, fecha: e.target.value})}
                className="w-full border rounded px-2 py-1" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input type="text" value={editMovement.descripcion}
                onChange={e => setEditMovement({...editMovement, descripcion: e.target.value})}
                className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Costo unitario</label>
              <input type="number" step="0.01" value={editMovement.costo}
                onChange={e => setEditMovement({...editMovement, costo: e.target.value})}
                className="w-full border rounded px-2 py-1" />
            </div>
            <div className="flex gap-2 mt-6">
              <button type="submit" disabled={editLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditModalOpen(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg">Cancelar</button>
            </div>
          </form>
        )}
      </ReactModal>

      {/* Modal de confirmación de eliminación */}
      <ReactModal
        isOpen={!!deleteConfirm?.open}
        onRequestClose={() => setDeleteConfirm(null)}
        className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 max-w-md mx-auto mt-20 outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        ariaHideApp={false}
      >
        <h2 className="text-xl font-bold mb-4 text-center">¿Eliminar movimiento?</h2>
        <p className="mb-4 text-center">Esta acción no se puede deshacer.</p>
        <div className="flex gap-2 mt-6">
          <button
            onClick={async () => {
              if (!deleteConfirm?.movement) return;
              setDeleteLoading(true);
              try {
                await deleteMovement(deleteConfirm.movement.id);
                toast.success('Movimiento eliminado correctamente');
                setDeleteConfirm(null);
                refreshData();
              } catch (err) {
                toast.error('Error al eliminar movimiento');
              } finally {
                setDeleteLoading(false);
              }
            }}
            disabled={deleteLoading}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg"
          >
            {deleteLoading ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </ReactModal>
    </div>
  );
};

export default ControlCardView;