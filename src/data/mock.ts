import { Product, InventoryMovement, Supplier, Client, HistoryEntry } from '@/types';

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

export const mockProducts: Product[] = [
  { id: '1', name: 'Riz Oncle Sam 25kg', category: 'Céréales', purchasePrice: 12000, salePrice: 14500, stock: 45, minStock: 10, companyId: '1', createdAt: '2024-01-15', updatedAt: today },
  { id: '2', name: 'Huile Dinor 5L', category: 'Huiles', purchasePrice: 4500, salePrice: 5800, stock: 3, minStock: 5, companyId: '1', createdAt: '2024-01-15', updatedAt: today },
  { id: '3', name: 'Sucre en poudre 1kg', category: 'Épicerie', purchasePrice: 800, salePrice: 1100, stock: 120, minStock: 20, companyId: '1', createdAt: '2024-02-01', updatedAt: today },
  { id: '4', name: 'Lait Nido 400g', category: 'Produits laitiers', purchasePrice: 2200, salePrice: 2800, stock: 8, minStock: 10, companyId: '1', createdAt: '2024-02-10', updatedAt: today },
  { id: '5', name: 'Tomate concentrée Gino 400g', category: 'Conserves', purchasePrice: 600, salePrice: 850, stock: 60, minStock: 15, companyId: '1', createdAt: '2024-03-01', updatedAt: today },
  { id: '6', name: 'Savon Azur 200g', category: 'Hygiène', purchasePrice: 300, salePrice: 450, stock: 200, minStock: 30, companyId: '1', createdAt: '2024-03-05', updatedAt: today },
  { id: '7', name: 'Sel Balan 1kg', category: 'Épicerie', purchasePrice: 250, salePrice: 400, stock: 2, minStock: 15, companyId: '1', createdAt: '2024-03-10', updatedAt: today },
  { id: '8', name: 'Pâtes Tria 500g', category: 'Céréales', purchasePrice: 500, salePrice: 700, stock: 80, minStock: 20, companyId: '1', createdAt: '2024-03-15', updatedAt: today },
];

export const mockMovements: InventoryMovement[] = [
  { id: '1', productId: '1', productName: 'Riz Oncle Sam 25kg', type: 'entry', quantity: 50, date: today, comment: 'Livraison fournisseur', companyId: '1' },
  { id: '2', productId: '2', productName: 'Huile Dinor 5L', type: 'exit', quantity: 10, date: today, comment: '', companyId: '1' },
  { id: '3', productId: '3', productName: 'Sucre en poudre 1kg', type: 'entry', quantity: 100, date: today, companyId: '1' },
  { id: '4', productId: '5', productName: 'Tomate concentrée Gino 400g', type: 'exit', quantity: 20, date: yesterday, companyId: '1' },
  { id: '5', productId: '1', productName: 'Riz Oncle Sam 25kg', type: 'exit', quantity: 5, date: yesterday, companyId: '1' },
  { id: '6', productId: '4', productName: 'Lait Nido 400g', type: 'entry', quantity: 30, date: yesterday, companyId: '1' },
];

export const mockSuppliers: Supplier[] = [
  { id: '1', name: 'Société Générale Distribution', phone: '+225 07 08 09 10', address: 'Abidjan, Marcory', email: 'sgd@example.com', companyId: '1' },
  { id: '2', name: 'Import-Export Sahel', phone: '+226 70 11 22 33', address: 'Ouagadougou, Zone Industrielle', email: 'ies@example.com', companyId: '1' },
  { id: '3', name: 'Distribalim SA', phone: '+221 77 44 55 66', address: 'Dakar, Pikine', email: 'distrib@example.com', companyId: '1' },
];

export const mockClients: Client[] = [
  { id: '1', name: 'Boutique Mamadou', phone: '+225 05 12 34 56', address: 'Abidjan, Abobo', email: 'mamadou@example.com', companyId: '1' },
  { id: '2', name: 'Super Marché Central', phone: '+225 07 98 76 54', address: 'Abidjan, Plateau', email: 'smc@example.com', companyId: '1' },
  { id: '3', name: 'Alimentation Fatou', phone: '+225 01 23 45 67', address: 'Bouaké, Centre', email: 'fatou@example.com', companyId: '1' },
];

export const mockHistory: HistoryEntry[] = [
  { id: '1', type: 'entry', description: 'Entrée de 50 unités - Riz Oncle Sam 25kg', date: today + 'T10:30:00', productName: 'Riz Oncle Sam 25kg', companyId: '1' },
  { id: '2', type: 'exit', description: 'Sortie de 10 unités - Huile Dinor 5L', date: today + 'T09:15:00', productName: 'Huile Dinor 5L', companyId: '1' },
  { id: '3', type: 'price_change', description: 'Prix de vente modifié: 1000 → 1100 FCFA - Sucre en poudre 1kg', date: yesterday + 'T14:00:00', productName: 'Sucre en poudre 1kg', companyId: '1' },
  { id: '4', type: 'entry', description: 'Entrée de 100 unités - Sucre en poudre 1kg', date: today + 'T08:00:00', productName: 'Sucre en poudre 1kg', companyId: '1' },
  { id: '5', type: 'exit', description: 'Sortie de 20 unités - Tomate concentrée Gino 400g', date: yesterday + 'T16:30:00', productName: 'Tomate concentrée Gino 400g', companyId: '1' },
  { id: '6', type: 'product_add', description: 'Nouveau produit ajouté: Pâtes Tria 500g', date: '2024-03-15T11:00:00', productName: 'Pâtes Tria 500g', companyId: '1' },
];

export const categories = ['Céréales', 'Huiles', 'Épicerie', 'Produits laitiers', 'Conserves', 'Hygiène', 'Boissons', 'Condiments'];
