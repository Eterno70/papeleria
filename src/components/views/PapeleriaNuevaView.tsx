import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { generateCSV, downloadCSV, generateHTMLForPDF, printPage } from '../../utils/export';
import { formatCurrency } from '../../utils/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const meses = [
  'Todos los meses', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const anioActual = new Date().getFullYear();
const anios = Array.from({ length: anioActual - 2022 }, (_, i) => 2023 + i);

const PapeleriaNuevaView: React.FC = () => {
  const { articles, movements } = useData();
  const [filtroArticulo, setFiltroArticulo] = useState('');
  const [filtroMes, setFiltroMes] = useState(0); // 0 = todos
  const [filtroAnio, setFiltroAnio] = useState(anioActual);

  // Lógica de acumulados y filtrado
  const datos = useMemo(() => {
    return articles.map(articulo => {
      const movs = movements.filter(m => m.id_articulo === articulo.id);

      // Consumo del periodo filtrado
      const consumo = movs
        .filter(m => {
          if (m.tipo !== 'Salida') return false;
          const fecha = new Date(m.fecha);
          if (filtroAnio === 0) return true;
          if (filtroMes === 0) return fecha.getFullYear() === filtroAnio;
          return fecha.getFullYear() === filtroAnio && (fecha.getMonth() + 1) === filtroMes;
        })
        .reduce((sum, m) => sum + m.cantidad * articulo.costo, 0);

      // Consumo anual (todas las salidas del año filtrado)
      const consumoAnual = filtroAnio === 0
        ? movs.filter(m => m.tipo === 'Salida').reduce((sum, m) => sum + m.cantidad * articulo.costo, 0)
        : movs.filter(m => m.tipo === 'Salida' && new Date(m.fecha).getFullYear() === filtroAnio)
              .reduce((sum, m) => sum + m.cantidad * articulo.costo, 0);

      // Existencias hasta el mes/año seleccionado
      const existencias = movs
        .filter(m => {
          const fecha = new Date(m.fecha);
          if (filtroAnio === 0) return true;
          if (filtroMes === 0) return fecha.getFullYear() <= filtroAnio;
          return (
            fecha.getFullYear() < filtroAnio ||
            (fecha.getFullYear() === filtroAnio && fecha.getMonth() + 1 <= filtroMes)
          );
        })
        .reduce((sum, m) =>
          sum + (m.tipo === 'Entrada' ? m.cantidad : -m.cantidad), 0);

      const saldo = existencias * articulo.costo;

      return {
        ...articulo,
        consumo,
        consumoAnual,
        existencias,
        saldo,
      };
    }).filter(a =>
      !filtroArticulo || a.nombre.toLowerCase().includes(filtroArticulo.toLowerCase())
    );
  }, [articles, movements, filtroArticulo, filtroMes, filtroAnio]);

  // Exportar CSV
  const exportarCSV = () => {
    const headers = ['Artículo', 'Consumo', 'Existencias', 'Costo', 'Saldo'];
    const rows = datos.map(a => [
      a.nombre,
      a.consumo.toLocaleString('es-ES', { minimumFractionDigits: 2 }),
      a.existencias.toString(),
      formatCurrency(a.costo),
      formatCurrency(a.saldo)
    ]);
    const csv = generateCSV(headers, rows);
    downloadCSV(csv, 'papeleria_nueva.csv');
  };

  // Exportar PDF (genera y descarga el PDF, además de abrir la vista previa para imprimir)
  const exportarPDF = () => {
    const headers = ['Artículo', 'Consumo', 'Existencias', 'Costo', 'Saldo'];
    const rows = datos.map(a => [
      a.nombre,
      a.consumo.toLocaleString('es-ES', { minimumFractionDigits: 2 }),
      a.existencias.toString(),
      formatCurrency(a.costo),
      formatCurrency(a.saldo)
    ]);

    // Descargar PDF usando jsPDF
    const doc = new jsPDF();
    doc.text('Papelería Nueva', 14, 14);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20,
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [240, 240, 240], textColor: 0 },
    });
    doc.save('papeleria_nueva.pdf');

    // También abrir vista previa para imprimir (opcional)
    const tableHTML = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = generateHTMLForPDF('Papelería Nueva', tableHTML, {
      articleId: filtroArticulo || undefined,
      dateFrom: filtroMes && filtroAnio ? `${meses[filtroMes]} ${filtroAnio}` : undefined
    });
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  // Imprimir
  const imprimir = () => {
    exportarPDF();
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltroArticulo('');
    setFiltroMes(0);
    setFiltroAnio(anioActual);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Papelería Nueva</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <select
          className="border rounded px-2 py-1"
          value={filtroArticulo}
          onChange={e => setFiltroArticulo(e.target.value)}
        >
          <option value="">Todos los artículos</option>
          {articles.map(a => (
            <option key={a.id} value={a.nombre}>{a.nombre}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1"
          value={filtroMes}
          onChange={e => setFiltroMes(Number(e.target.value))}
        >
          {meses.map((mes, i) => (
            <option key={i} value={i}>{mes}</option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1"
          value={filtroAnio}
          onChange={e => setFiltroAnio(Number(e.target.value))}
        >
          <option value={0}>Todos los años</option>
          {anios.map(anio => (
            <option key={anio} value={anio}>{anio}</option>
          ))}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={imprimir} className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Imprimir</button>
          <button onClick={exportarPDF} className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">Exportar PDF</button>
          <button onClick={exportarCSV} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Exportar CSV</button>
          <button onClick={limpiarFiltros} className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">Limpiar filtros</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Artículo</th>
              <th className="px-4 py-2 text-right">Consumo</th>
              <th className="px-4 py-2 text-right">Consumo anual</th>
              <th className="px-4 py-2 text-right">Existencias</th>
              <th className="px-4 py-2 text-right">Costo</th>
              <th className="px-4 py-2 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {datos.map(a => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2">{a.nombre}</td>
                <td className="px-4 py-2 text-right">{a.consumo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-right">{a.consumoAnual.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-right">{a.existencias}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(a.costo)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(a.saldo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PapeleriaNuevaView; 