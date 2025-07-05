import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { verifyDatabaseSetup, getDatabaseStats, validateDataIntegrity } from '../../utils/database';

interface DatabaseStatusProps {
  onStatusChange?: (status: 'connected' | 'error' | 'loading') => void;
}

const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [details, setDetails] = useState<{
    connected: boolean;
    tablesExist: boolean;
    errors: string[];
    stats?: { articulos: number; movimientos: number };
    integrity?: { valid: boolean; issues: string[] };
  }>({
    connected: false,
    tablesExist: false,
    errors: []
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkDatabaseStatus = async () => {
    setIsRefreshing(true);
    try {
      const setupResult = await verifyDatabaseSetup();
      const stats = await getDatabaseStats();
      const integrity = await validateDataIntegrity();

      const newDetails = {
        ...setupResult,
        stats,
        integrity
      };

      setDetails(newDetails);

      if (setupResult.connected && setupResult.tablesExist && integrity.valid) {
        setStatus('connected');
        onStatusChange?.('connected');
      } else {
        setStatus('error');
        onStatusChange?.('error');
      }
    } catch (error) {
      setStatus('error');
      setDetails(prev => ({
        ...prev,
        errors: [...prev.errors, `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }));
      onStatusChange?.('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Database className="h-5 w-5 text-gray-400 animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="font-medium text-gray-900">Estado de la Base de Datos</h3>
        </div>
        <button
          onClick={checkDatabaseStatus}
          disabled={isRefreshing}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          {details.connected ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span>Conexión a Supabase: {details.connected ? 'Conectado' : 'Desconectado'}</span>
        </div>

        <div className="flex items-center gap-2">
          {details.tablesExist ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          <span>Tablas de inventario: {details.tablesExist ? 'Existentes' : 'No encontradas'}</span>
        </div>

        {details.stats && (
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span>
              Datos: {details.stats.articulos} artículos, {details.stats.movimientos} movimientos
            </span>
          </div>
        )}

        {details.integrity && (
          <div className="flex items-center gap-2">
            {details.integrity.valid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <span>
              Integridad: {details.integrity.valid ? 'Válida' : `${details.integrity.issues.length} problemas`}
            </span>
          </div>
        )}
      </div>

      {details.errors.length > 0 && (
        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm">
          <div className="font-medium text-red-800 mb-1">Errores encontrados:</div>
          <ul className="text-red-700 space-y-1">
            {details.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {details.integrity && details.integrity.issues.length > 0 && (
        <div className="mt-3 p-2 bg-yellow-100 border border-yellow-200 rounded text-sm">
          <div className="font-medium text-yellow-800 mb-1">Problemas de integridad:</div>
          <ul className="text-yellow-700 space-y-1">
            {details.integrity.issues.map((issue, index) => (
              <li key={index}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {!details.tablesExist && (
        <div className="mt-3 p-2 bg-blue-100 border border-blue-200 rounded text-sm">
          <div className="font-medium text-blue-800 mb-1">Acción requerida:</div>
          <p className="text-blue-700">
            Las tablas de inventario no existen. Por favor, ejecuta el archivo de migración SQL 
            en tu panel de Supabase para crear las tablas necesarias.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DatabaseStatus;