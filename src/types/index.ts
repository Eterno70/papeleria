export interface Article {
  id: number;
  nombre: string;
  costo: number;
}

export interface Movement {
  id: number;
  fecha: string;
  id_articulo: number;
  tipo: 'Entrada' | 'Salida';
  cantidad: number;
  descripcion: string;
  costo: number;
}

export interface StockStatus {
  articleId: number;
  stock: number;
  status: 'Sin Stock' | 'Stock Bajo' | 'Stock Normal';
}

export interface DashboardStats {
  totalArticles: number;
  totalValue: number;
  lowStockItems: number;
  recentMovements: number;
}