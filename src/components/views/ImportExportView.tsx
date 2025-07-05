import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../../contexts/DataContext';
import { supabaseClient } from '../../lib/supabase';
import ReactModal from 'react-modal';

interface ImportSummary {
  articles: { nombre: string; costo: number }[];
  movements: { articulo: string; tipo: 'Entrada' | 'Salida'; fecha: string; descripcion: string; cantidad: number; costo: number }[];
  movimientosDescartados?: { articulo: string; tipo: string; fecha: string; descripcion: string; cantidad: number; costo: number }[];
}

// Función para normalizar nombres (mayúsculas, sin tildes, sin espacios extra)
function normalizeName(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/\s+/g, ' ') // espacios múltiples a uno
    .trim()
    .toUpperCase();
}

// Función auxiliar para convertir serial de Excel a fecha ISO
function excelDateToISO(serial: number): string {
  // Excel: 1 = 1900-01-01
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const days = Math.floor(serial);
  const ms = days * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + ms);
  return date.toISOString().slice(0, 10);
}

const ImportExportView = () => {
  const { addArticle, addMovement, articles: existingArticles } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSummary, setModalSummary] = useState<{articulos: number, movimientos: number, advertencia?: string, movimientosNoAsociadosDetalle?: { original: string, normalizado: string, tipo: string, fecha: string, descripcion: string, cantidad: number, costo: number, motivo: string }[]} | null>(null);
  // Estado para saber si los artículos ya fueron importados
  const [articulosImportados, setArticulosImportados] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportWarnings([]);
    setImportErrors([]);
    setImportSummary(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    let articles: { nombre: string; costo: number }[] = [];
    let movements: { articulo: string; tipo: 'Entrada' | 'Salida'; fecha: string; descripcion: string; cantidad: number; costo: number }[] = [];
    let warnings: string[] = [];
    let errors: string[] = [];
    let formatoTabular = false;
    workbook.SheetNames.forEach(sheetName => {
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });
      // Detectar formato tabular por columnas
      if (sheet.length > 0 && sheet[0].Nombre_Articulo && sheet[0].Costo_Unitario) {
        formatoTabular = true;
        for (const row of sheet) {
          if (!row.Nombre_Articulo) continue;
          articles.push({
            nombre: row.Nombre_Articulo.toString().trim(),
            costo: Number(row.Costo_Unitario) || 0
          });
        }
      }
    });
    let formatoTabularMovimientos = false;
    workbook.SheetNames.forEach(sheetName => {
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });
      // Detectar formato tabular de movimientos por columnas
      if (sheet.length > 0 && sheet[0].Nombre_Articulo && sheet[0].Tipo_Movimiento && sheet[0].Cantidad && sheet[0].Fecha) {
        formatoTabularMovimientos = true;
        for (const row of sheet) {
          if (!row.Nombre_Articulo || !row.Tipo_Movimiento || !row.Cantidad) continue;
          movements.push({
            articulo: row.Nombre_Articulo.toString().trim(),
            tipo: row.Tipo_Movimiento === 'Entrada' ? 'Entrada' : 'Salida',
            fecha: row.Fecha,
            descripcion: row.Descripcion || '',
            cantidad: Math.round(Number(row.Cantidad)),
            costo: row.Costo_Unitario ? Number(row.Costo_Unitario) : 0
          });
        }
      } else if (sheet.length > 0 && sheet[0].ID_Articulo && sheet[0].Tipo_Movimiento && sheet[0].Cantidad && sheet[0].Fecha) {
        formatoTabularMovimientos = true;
        for (const row of sheet) {
          if (!row.ID_Articulo || !row.Tipo_Movimiento || !row.Cantidad) continue;
          movements.push({
            articulo: '', // No se usa el nombre, solo el ID
            tipo: row.Tipo_Movimiento === 'Entrada' ? 'Entrada' : 'Salida',
            fecha: row.Fecha,
            descripcion: row.Descripcion || '',
            cantidad: Math.round(Number(row.Cantidad)),
            costo: row.Costo_Unitario ? Number(row.Costo_Unitario) : 0,
            id_articulo: Number(row.ID_Articulo)
          });
        }
      }
    });
    if (!formatoTabular && !formatoTabularMovimientos) {
      // Parser anterior (PRODUCTO: ...)
      workbook.SheetNames.forEach(sheetName => {
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, blankrows: false });
        let currentArticle: { nombre: string; costo: number } | null = null;
        let inMovements = false;
        for (let i = 0; i < sheet.length; i++) {
          const row = sheet[i];
          if (!Array.isArray(row) || row.length === 0) continue;
          // Detectar artículo
          if (typeof row[0] === 'string' && row[0].toUpperCase().includes('PRODUCTO:')) {
            const nombre = (row[0].split(':')[1] || '').trim() + (row[1] ? ' ' + row[1] : '');
            if (!nombre) {
              errors.push(`Se detectó un artículo sin nombre en la hoja '${sheetName}', fila ${i + 1}.`);
              continue;
            }
            currentArticle = { nombre, costo: 0 };
            articles.push(currentArticle);
            inMovements = false;
          }
          // Detectar encabezado de movimientos
          if (typeof row[0] === 'string' && row[0].toUpperCase().includes('FEC')) {
            inMovements = true;
            continue;
          }
          // Leer movimientos
          if (inMovements && currentArticle) {
            let fecha = '';
            if (typeof row[0] === 'number') {
              fecha = excelDateToISO(row[0]);
            } else if (typeof row[0] === 'string' && row[0].match(/^\d{4}-\d{2}-\d{2}/)) {
              fecha = row[0];
            }
            if (fecha) {
              const descripcion = row[1] || '';
              // Entrada
              if (row[2] && !isNaN(Number(row[2]))) {
                movements.push({
                  articulo: currentArticle.nombre,
                  tipo: 'Entrada',
                  fecha,
                  descripcion,
                  cantidad: Math.round(Number(row[2])),
                  costo: Number(row[3]) || 0
                });
                if (Number(row[3]) > (currentArticle.costo || 0)) {
                  currentArticle.costo = Number(row[3]);
                }
              }
              // Salida
              if (row[7] && !isNaN(Number(row[7]))) {
                movements.push({
                  articulo: currentArticle.nombre,
                  tipo: 'Salida',
                  fecha,
                  descripcion,
                  cantidad: Math.round(Number(row[7])),
                  costo: Number(row[8]) || 0
                });
              }
            }
          }
        }
      });
    }
    // Filtrar movimientos con cantidad inválida antes de importar
    const movimientosValidos = movements.filter(m => m.cantidad > 0);
    const movimientosDescartados = movements.filter(m => m.cantidad <= 0);
    setImportWarnings(warnings);
    setImportErrors(errors);
    setImportSummary({ articles, movements: movimientosValidos, movimientosDescartados });
  };

  // En el resumen previo, calcular cuántos movimientos se asociarán correctamente
  const nombreToId: Record<string, number> = {};
  existingArticles.forEach(a => {
    nombreToId[a.nombre.trim().toUpperCase()] = a.id;
  });
  if (importSummary) {
    importSummary.articles.forEach(a => {
      nombreToId[a.nombre.trim().toUpperCase()] = 1; // 1 como placeholder, el ID real se asigna tras la inserción
    });
  }
  const movimientosAsociados = importSummary ? importSummary.movements.filter(mov => nombreToId[mov.articulo.trim().toUpperCase()]).length : 0;
  const movimientosSinAsociar = importSummary ? importSummary.movements.length - movimientosAsociados : 0;

  // Función para importar solo artículos
  const handleImportArticles = async () => {
    if (!importSummary || importErrors.length > 0) return;
    setImporting(true);
    await supabaseClient.from('articulos').delete().neq('id', 0);
    const articulosUnicos: { nombre: string; costo: number }[] = [];
    const nombresVistos = new Set<string>();
    for (const art of importSummary.articles) {
      const nombreKey = normalizeName(art.nombre);
      if (!nombresVistos.has(nombreKey)) {
        articulosUnicos.push({ ...art, nombre: nombreKey });
        nombresVistos.add(nombreKey);
      }
    }
    for (const art of articulosUnicos) {
      await addArticle({ nombre: art.nombre, costo: art.costo });
    }
    setImporting(false);
    setArticulosImportados(true);
    setModalSummary({
      articulos: articulosUnicos.length,
      movimientos: 0,
      advertencia: undefined
    });
    setModalOpen(true);
  };

  // En la importación de movimientos, si existe Nombre_Articulo, asociar por nombre
  const handleImportMovements = async () => {
    if (!importSummary || importErrors.length > 0) return;
    setImporting(true);
    await supabaseClient.from('movimientos').delete().neq('id', 0);
    // Obtener artículos de la base de datos
    const { data: dbArticles } = await supabaseClient.from('articulos').select('id, nombre');
    const nombreToId: Record<string, number> = {};
    if (Array.isArray(dbArticles)) {
      (dbArticles as { id: number; nombre: string }[]).forEach((a) => {
        const norm = normalizeName(a.nombre);
        nombreToId[norm] = a.id;
      });
    }
    let movimientosSinArticulo = 0;
    let movimientosImportados = 0;
    let movimientosNoAsociadosDetalle: { original: string, normalizado: string, tipo: string, fecha: string, descripcion: string, cantidad: number, costo: number, motivo: string }[] = [];
    for (const mov of importSummary.movements) {
      let id_articulo = mov.id_articulo;
      // Si tiene Nombre_Articulo, asociar por nombre
      if (mov.articulo && mov.articulo.length > 0) {
        const nombreKey = normalizeName(mov.articulo);
        id_articulo = nombreToId[nombreKey];
      }
      if (id_articulo) {
        await addMovement({
          id_articulo,
          tipo: mov.tipo,
          cantidad: mov.cantidad,
          fecha: mov.fecha,
          descripcion: mov.descripcion,
          costo: mov.costo
        });
        movimientosImportados++;
      } else {
        movimientosSinArticulo++;
        movimientosNoAsociadosDetalle.push({
          original: mov.articulo,
          normalizado: mov.id_articulo ? `ID: ${mov.id_articulo}` : normalizeName(mov.articulo),
          tipo: mov.tipo,
          fecha: mov.fecha,
          descripcion: mov.descripcion,
          cantidad: mov.cantidad,
          costo: mov.costo,
          motivo: 'No se encontró artículo con ese nombre o ID'
        });
      }
    }
    setImporting(false);
    setModalSummary({
      articulos: 0,
      movimientos: movimientosImportados,
      advertencia: movimientosSinArticulo > 0 ? `${movimientosSinArticulo} movimientos no se importaron por no tener artículo asociado.` : undefined,
      movimientosNoAsociadosDetalle
    });
    setModalOpen(true);
  };

  const movimientosDescartados = importSummary && importSummary.movimientosDescartados ? importSummary.movimientosDescartados : [];

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-2xl font-bold mb-4">Importar artículos y movimientos desde Excel</h2>
              <input
                ref={fileInputRef}
                type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="mb-4"
        />
        {importErrors.length > 0 && (
          <div className="mb-2 text-red-600">
            <b>Errores críticos detectados:</b>
            <ul className="list-disc ml-6">
              {importErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
        {importWarnings.length > 0 && (
          <div className="mb-2 text-yellow-700">
            <b>Advertencias:</b>
            <ul className="list-disc ml-6">
              {importWarnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </div>
        )}
        {importSummary && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Resumen de importación</h3>
            <div>Artículos detectados: {importSummary.articles.length}</div>
            <div>Movimientos detectados: {importSummary.movements.length}</div>
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleImportArticles}
                disabled={importing || importErrors.length > 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Importar solo artículos
              </button>
              <button
                onClick={handleImportMovements}
                disabled={importing || importErrors.length > 0 || !articulosImportados}
                className={`px-4 py-2 rounded-lg ${articulosImportados ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                Importar solo movimientos
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">Primero importa los artículos, luego los movimientos.</div>
            <div className="text-sm text-gray-700 mb-2">
              <span className="mr-4">Movimientos que se asociarán correctamente: <b>{movimientosAsociados}</b></span>
              <span>Movimientos sin artículo asociado: <b>{movimientosSinAsociar}</b></span>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold mb-1">Artículos</h4>
              <table className="min-w-full text-sm border mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 border">Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {importSummary.articles.map((a, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 border">{a.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4 className="font-semibold mb-1">Primeros movimientos</h4>
              <table className="min-w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 border">Artículo</th>
                    <th className="px-2 py-1 border">Tipo</th>
                    <th className="px-2 py-1 border">Fecha</th>
                    <th className="px-2 py-1 border">Descripción</th>
                    <th className="px-2 py-1 border">Cantidad</th>
                    <th className="px-2 py-1 border">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {importSummary.movements.slice(0,5).map((m, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 border">{m.articulo}</td>
                      <td className="px-2 py-1 border">{m.tipo}</td>
                      <td className="px-2 py-1 border">{m.fecha}</td>
                      <td className="px-2 py-1 border">{m.descripcion}</td>
                      <td className="px-2 py-1 border">{m.cantidad}</td>
                      <td className="px-2 py-1 border">{m.costo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ReactModal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 max-w-lg mx-auto mt-20 outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
        ariaHideApp={false}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Importación completada</h2>
        {modalSummary && (
          <div>
            <div className="mb-2">Artículos importados: <b>{modalSummary.articulos}</b></div>
            <div className="mb-2">Movimientos importados: <b>{modalSummary.movimientos}</b></div>
            {modalSummary.advertencia && (
              <div className="mt-4 text-yellow-700 font-semibold">⚠️ {modalSummary.advertencia}</div>
            )}
            {modalSummary.movimientosNoAsociadosDetalle && modalSummary.movimientosNoAsociadosDetalle.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Movimientos no asociados</h4>
                <div className="overflow-x-auto max-h-64">
                  <table className="min-w-full text-xs border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border">Artículo original</th>
                        <th className="px-2 py-1 border">Normalizado</th>
                        <th className="px-2 py-1 border">Tipo</th>
                        <th className="px-2 py-1 border">Fecha</th>
                        <th className="px-2 py-1 border">Descripción</th>
                        <th className="px-2 py-1 border">Cantidad</th>
                        <th className="px-2 py-1 border">Costo</th>
                        <th className="px-2 py-1 border">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalSummary.movimientosNoAsociadosDetalle.slice(0,20).map((m, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 border">{m.original}</td>
                          <td className="px-2 py-1 border">{m.normalizado}</td>
                          <td className="px-2 py-1 border">{m.tipo}</td>
                          <td className="px-2 py-1 border">{m.fecha}</td>
                          <td className="px-2 py-1 border">{m.descripcion}</td>
                          <td className="px-2 py-1 border">{m.cantidad}</td>
                          <td className="px-2 py-1 border">{m.costo}</td>
                          <td className="px-2 py-1 border text-red-600">{m.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-gray-500 mt-1">Mostrando máximo 20 movimientos no asociados.</div>
                </div>
              </div>
            )}
            {movimientosDescartados.length > 0 && (
              <div className="mt-4 text-yellow-700 font-semibold">
                ⚠️ {movimientosDescartados.length} movimientos fueron descartados por cantidad inválida (≤ 0).
                <div className="overflow-x-auto max-h-40 mt-2">
                  <table className="min-w-full text-xs border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border">Artículo</th>
                        <th className="px-2 py-1 border">Tipo</th>
                        <th className="px-2 py-1 border">Fecha</th>
                        <th className="px-2 py-1 border">Descripción</th>
                        <th className="px-2 py-1 border">Cantidad</th>
                        <th className="px-2 py-1 border">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosDescartados.slice(0,20).map((m, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 border">{m.articulo}</td>
                          <td className="px-2 py-1 border">{m.tipo}</td>
                          <td className="px-2 py-1 border">{m.fecha}</td>
                          <td className="px-2 py-1 border">{m.descripcion}</td>
                          <td className="px-2 py-1 border text-red-600">{m.cantidad}</td>
                          <td className="px-2 py-1 border">{m.costo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-gray-500 mt-1">Mostrando máximo 20 movimientos descartados.</div>
                </div>
              </div>
            )}
            <button onClick={() => setModalOpen(false)} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg w-full">Cerrar</button>
          </div>
        )}
      </ReactModal>
    </div>
  );
};

export default ImportExportView;