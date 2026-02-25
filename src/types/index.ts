export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  companyId: string;
  companyName: string;
  devise: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'entry' | 'exit';
  quantity: number;
  date: string;
  comment?: string;
  companyId: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  companyId: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  companyId: string;
}

export interface HistoryEntry {
  id: string;
  type: 'entry' | 'exit' | 'price_change' | 'product_add' | 'product_delete';
  description: string;
  date: string;
  productName?: string;
  companyId: string;
}

export interface DashboardStats {
  totalProducts: number;
  stockValue: number;
  todayEntries: number;
  todayExits: number;
  lowStockProducts: Product[];
}
