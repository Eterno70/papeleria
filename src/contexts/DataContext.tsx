import React, { createContext, useContext, useState, useEffect } from 'react';
import { Article, Movement } from '../types';
import { supabaseClient } from '../lib/supabase';
import { verifyDatabaseSetup } from '../utils/database';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface DataContextType {
  articles: Article[];
  movements: Movement[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addArticle: (article: Omit<Article, 'id'>) => Promise<void>;
  updateArticle: (id: number, article: Partial<Article>) => Promise<void>;
  deleteArticle: (id: number) => Promise<void>;
  addMovement: (movement: Omit<Movement, 'id'>) => Promise<void>;
  updateMovement: (id: number, movement: Partial<Movement>) => Promise<void>;
  deleteMovement: (id: number) => Promise<void>;
  getStock: (articleId: number) => number;
  actualizarCostosMovimientos: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [databaseReady, setDatabaseReady] = useState(false);
  const { user } = useAuth();

  const loadArticles = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('articulos')
        .select('id, nombre, costo, descripcion, categoria, activo')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      
      // Mapear datos de Supabase al formato esperado por la aplicación
      const mappedArticles = (data || []).map(item => ({
        id: item.id,
        nombre: item.nombre,
        costo: parseFloat(item.costo || '0')
      }));
      
      setArticles(mappedArticles);
      console.log('✅ Artículos cargados desde Supabase:', mappedArticles.length);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast.error('Error al cargar artículos desde la base de datos');
      throw error;
    }
  };

  const loadMovements = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('movimientos')
        .select(`
          id, 
          id_articulo, 
          tipo, 
          cantidad, 
          fecha, 
          descripcion, 
          costo_unitario,
          created_at
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Mapear datos de Supabase al formato esperado por la aplicación
      const mappedMovements = (data || []).map(item => ({
        id: item.id,
        id_articulo: item.id_articulo,
        tipo: item.tipo as 'Entrada' | 'Salida',
        cantidad: item.cantidad,
        fecha: item.fecha,
        descripcion: item.descripcion || '',
        costo: parseFloat(item.costo_unitario || '0')
      }));
      
      setMovements(mappedMovements);
      console.log('✅ Movimientos cargados desde Supabase:', mappedMovements.length);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast.error('Error al cargar movimientos desde la base de datos');
      throw error;
    }
  };

  const refreshData = async () => {
    setLoading(true);
    
    try {
      // Verificar configuración de la base de datos
      const dbStatus = await verifyDatabaseSetup();
      
      if (!dbStatus.connected) {
        console.error('Database not connected:', dbStatus.errors);
        toast.error('No se pudo conectar a la base de datos');
        setLoading(false);
        return;
      }
      
      if (!dbStatus.tablesExist) {
        console.warn('Database tables do not exist:', dbStatus.errors);
        toast.error('Las tablas de la base de datos no existen. Por favor, ejecuta las migraciones SQL.');
        setLoading(false);
        return;
      }
      
      setDatabaseReady(true);
      await Promise.all([loadArticles(), loadMovements()]);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Error al actualizar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const addArticle = async (articleData: Omit<Article, 'id'>) => {
    try {
      if (!databaseReady) {
        throw new Error('Base de datos no disponible');
      }

      const { data, error } = await supabaseClient
        .from('articulos')
        .insert({
          nombre: articleData.nombre.toUpperCase(),
          costo: articleData.costo,
          categoria: 'GENERAL',
          unidad_medida: 'UNIDAD',
          activo: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newArticle = {
        id: data.id,
        nombre: data.nombre,
        costo: parseFloat(data.costo)
      };
      
      setArticles(prev => [...prev, newArticle]);
      toast.success('Artículo agregado correctamente');
    } catch (error) {
      console.error('Error adding article:', error);
      toast.error('Error al agregar artículo');
      throw error;
    }
  };

  const updateArticle = async (id: number, articleData: Partial<Article>) => {
    try {
      if (!databaseReady) {
        throw new Error('Base de datos no disponible');
      }

      const updateData: any = {};
      if (articleData.nombre) updateData.nombre = articleData.nombre.toUpperCase();
      if (articleData.costo !== undefined) updateData.costo = articleData.costo;

      const { data, error } = await supabaseClient
        .from('articulos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedArticle = {
        id: data.id,
        nombre: data.nombre,
        costo: parseFloat(data.costo)
      };
      
      setArticles(prev => prev.map(article => 
        article.id === id ? updatedArticle : article
      ));
      toast.success('Artículo actualizado correctamente');
    } catch (error) {
      console.error('Error updating article:', error);
      toast.error('Error al actualizar artículo');
      throw error;
    }
  };

  const deleteArticle = async (id: number) => {
    try {
      if (!databaseReady) {
        throw new Error('Base de datos no disponible');
      }

      // Verificar si hay movimientos asociados
      const { data: movementsData, error: movementsError } = await supabaseClient
        .from('movimientos')
        .select('id')
        .eq('id_articulo', id)
        .limit(1);

      if (movementsError) throw movementsError;

      if (movementsData && movementsData.length > 0) {
        toast.error('No se puede eliminar un artículo que tiene movimientos registrados');
        return;
      }

      const { error } = await supabaseClient
        .from('articulos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setArticles(prev => prev.filter(article => article.id !== id));
      toast.success('Artículo eliminado correctamente');
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Error al eliminar artículo');
      throw error;
    }
  };

  const addMovement = async (movementData: Omit<Movement, 'id'>) => {
    try {
      if (!databaseReady) {
        throw new Error('Base de datos no disponible');
      }

      const { data, error } = await supabaseClient
        .from('movimientos')
        .insert({
          id_articulo: movementData.id_articulo,
          id_usuario: user?.id || null,
          tipo: movementData.tipo,
          cantidad: movementData.cantidad,
          fecha: movementData.fecha,
          descripcion: movementData.descripcion.toUpperCase(),
          costo_unitario: movementData.costo
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newMovement = {
        id: data.id,
        id_articulo: data.id_articulo,
        tipo: data.tipo as 'Entrada' | 'Salida',
        cantidad: data.cantidad,
        fecha: data.fecha,
        descripcion: data.descripcion,
        costo: parseFloat(data.costo_unitario)
      };
      
      setMovements(prev => [newMovement, ...prev]);
      toast.success('Movimiento registrado correctamente');
    } catch (error) {
      console.error('Error adding movement:', error);
      if (error instanceof Error && error.message.includes('Stock insuficiente')) {
        toast.error(error.message);
      } else {
        toast.error('Error al registrar movimiento');
      }
      throw error;
    }
  };

  const updateMovement = async (id: number, movementData: Partial<Movement>) => {
    try {
      if (!databaseReady) {
        throw new Error('Base de datos no disponible');
      }

      const updateData: any = {};
      if (movementData.cantidad !== undefined) updateData.cantidad = movementData.cantidad;
      if (movementData.fecha) updateData.fecha = movementData.fecha;
      if (movementData.descripcion) updateData.descripcion = movementData.descripcion.toUpperCase();
      if (movementData.costo !== undefined) updateData.costo_unitario = movementData.costo;

      const { data, error } = await supabaseClient
        .from('movimientos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedMovement = {
        id: data.id,
        id_articulo: data.id_articulo,
        tipo: data.tipo as 'Entrada' | 'Salida',
        cantidad: data.cantidad,
        fecha: data.fecha,
        descripcion: data.descripcion,
        costo: parseFloat(data.costo_unitario)
      };
      
      setMovements(prev => prev.map(movement => 
        movement.id === id ? updatedMovement : movement
      ));
      toast.success('Movimiento actualizado correctamente');
    } catch (error) {
      console.error('Error updating movement:', error);
      toast.error('Error al actualizar movimiento');
      throw error;
    }
  };

  const deleteMovement = async (id: number) => {
    try {
      if (!databaseReady) {
        throw new Error('Base de datos no disponible');
      }

      const { error } = await supabaseClient
        .from('movimientos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMovements(prev => prev.filter(movement => movement.id !== id));
      toast.success('Movimiento eliminado correctamente');
    } catch (error) {
      console.error('Error deleting movement:', error);
      toast.error('Error al eliminar movimiento');
      throw error;
    }
  };

  const getStock = (articleId: number): number => {
    const articleMovements = movements.filter(m => m.id_articulo === articleId);
    return articleMovements.reduce((stock, movement) => {
      return movement.tipo === 'Entrada' 
        ? stock + movement.cantidad 
        : stock - movement.cantidad;
    }, 0);
  };

  // Función para actualizar el costo de todos los movimientos con costo 0
  const actualizarCostosMovimientos = async () => {
    const movimientosActualizar = movements.filter(mov => mov.costo === 0);
    for (const mov of movimientosActualizar) {
      const articulo = articles.find(a => a.id === mov.id_articulo);
      if (articulo && articulo.costo > 0) {
        await updateMovement(mov.id, { costo: articulo.costo });
      }
    }
    toast.success('Movimientos actualizados con el costo unitario del artículo');
    await refreshData();
  };

  return (
    <DataContext.Provider value={{
      articles,
      movements,
      loading,
      refreshData,
      addArticle,
      updateArticle,
      deleteArticle,
      addMovement,
      updateMovement,
      deleteMovement,
      getStock,
      actualizarCostosMovimientos
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};