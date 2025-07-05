// Export utilities for the inventory management system
import { Article, Movement } from '../types';
import { formatCurrency, formatDate } from './format';

export interface ExportFilters {
  articleId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  description?: string;
  status?: string;
}

// Utilidad para formatear moneda solo con $ y dos decimales
const simpleCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

// Generate CSV content from table data
export const generateCSV = (headers: string[], rows: string[][]): string => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
};

// Download CSV file
export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Generate HTML content for PDF export
export const generateHTMLForPDF = (title: string, content: string, filters?: ExportFilters): string => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const currentTime = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let filterInfo = '';
  if (filters) {
    const filterParts = [];
    if (filters.articleId) filterParts.push(`Artículo: ${filters.articleId}`);
    if (filters.type) filterParts.push(`Tipo: ${filters.type}`);
    if (filters.dateFrom && filters.dateTo) {
      filterParts.push(`Período: ${filters.dateFrom} al ${filters.dateTo}`);
    } else if (filters.dateFrom) {
      filterParts.push(`Desde: ${filters.dateFrom}`);
    } else if (filters.dateTo) {
      filterParts.push(`Hasta: ${filters.dateTo}`);
    }
    if (filters.description) filterParts.push(`Descripción: "${filters.description}"`);
    if (filters.status) filterParts.push(`Estado: ${filters.status}`);
    
    if (filterParts.length > 0) {
      filterInfo = `<div class="filters-info">Filtros aplicados: ${filterParts.join(' | ')}</div>`;
    }
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: white;
            color: #000;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            color: #000;
        }
        .header .meta {
            text-align: right;
            font-size: 12px;
            color: #666;
        }
        .company-info {
            margin-bottom: 10px;
            font-weight: bold;
            color: #000;
        }
        .filters-info {
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 12px;
            color: #333;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            font-size: 11px;
            margin-top: 10px;
        }
        th, td {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: left;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
            color: #000;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .font-medium {
            font-weight: 600;
        }
        .status-badge {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }
        .status-success { background-color: #dcfce7; color: #166534; }
        .status-warning { background-color: #fef3c7; color: #92400e; }
        .status-error { background-color: #fee2e2; color: #991b1b; }
        .status-info { background-color: #dbeafe; color: #1e40af; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="company-info">Sistema de Control de Inventario</div>
            <div class="company-info">Alcaldía Municipal de Cabañas Oeste</div>
            <h1>${title}</h1>
            <div>${currentDate} - ${currentTime}</div>
        </div>
        <div class="meta">
            <div>Unidad de Informática</div>
            <div>Página 1 de 1</div>
        </div>
    </div>
    
    ${filterInfo}
    ${content}
    
    <div style="margin-top: 30px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10px;">
        Sistema de Control de Inventario - Generado automáticamente el ${currentDate} a las ${currentTime}
    </div>
</body>
</html>`;
};

// Download HTML file
export const downloadHTML = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

// Print current page
export const printPage = (): void => {
  window.print();
};

// Export articles to CSV
export const exportArticlesToCSV = (articles: Article[], getStock: (id: number) => number, filters?: ExportFilters): void => {
  const headers = ['ID', 'Artículo', 'Costo Unitario', 'Stock Actual', 'Valor Total'];
  const rows = articles.map(article => {
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
  
  const csvContent = generateCSV(headers, rows);
  const filename = `articulos_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
};

// Export movements to CSV
export const exportMovementsToCSV = (movements: Movement[], getArticleName: (id: number) => string, filters?: ExportFilters): void => {
  const headers = ['Fecha', 'Artículo', 'Tipo', 'Cantidad', 'Costo', 'Descripción', 'Valor Total'];
  const rows = movements.map(movement => [
    formatDate(movement.fecha),
    getArticleName(movement.id_articulo),
    movement.tipo,
    movement.cantidad.toString(),
    simpleCurrency(movement.costo),
    movement.descripcion || '',
    simpleCurrency(movement.cantidad * movement.costo)
  ]);
  
  const csvContent = generateCSV(headers, rows);
  const filename = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
};

// Export existencias to CSV
export const exportExistenciasToCSV = (articles: Article[], getStock: (id: number) => number, filters?: ExportFilters): void => {
  const headers = ['Artículo', 'Stock', 'Costo Unitario', 'Valor Total', 'Estado'];
  const rows = articles.map(article => {
    const stock = getStock(article.id);
    const totalValue = stock * article.costo;
    let status = 'Stock Normal';
    if (stock === 0) status = 'Sin Stock';
    else if (stock <= 5) status = 'Stock Bajo';
    
    return [
      article.nombre,
      `${stock} unidades`,
      simpleCurrency(article.costo),
      simpleCurrency(totalValue),
      status
    ];
  });
  
  const csvContent = generateCSV(headers, rows);
  const filename = `existencias_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, filename);
};

// Generate table HTML for export
export const generateTableHTML = (headers: string[], rows: string[][]): string => {
  return `
    <table>
      <thead>
        <tr>
          ${headers.map(header => `<th>${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};