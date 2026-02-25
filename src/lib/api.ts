// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('auth_token');
export const setToken = (t: string) => localStorage.setItem('auth_token', t);
export const clearToken = () => localStorage.removeItem('auth_token');

// ── Base URL (utilise VITE_API_URL en production, /api en local) ──────────────
const BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api';

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Erreur ${res.status}`);
  return json;
}

// ── Field mappers ─────────────────────────────────────────────────────────────
const mapContact = (c: any) => ({
  id: String(c.id),
  name: c.nom || '',
  phone: c.telephone || '',
  address: c.adresse || '',
  email: c.email || '',
  companyId: String(c.entreprise_id || ''),
});

export const mapProduct = (p: any) => ({
  id: String(p.id),
  name: p.nom || '',
  category: p.categorie_nom || '',
  categoryId: p.categorie_id ? String(p.categorie_id) : '',
  purchasePrice: Number(p.prix_achat) || 0,
  salePrice: Number(p.prix_vente) || 0,
  stock: Number(p.stock_actuel) || 0,
  minStock: Number(p.stock_minimum) || 0,
  companyId: String(p.entreprise_id || ''),
  createdAt: p.created_at ? String(p.created_at) : '',
  updatedAt: p.updated_at ? String(p.updated_at) : '',
});

const mapMovement = (m: any) => ({
  id: String(m.id),
  productId: String(m.produit_id || ''),
  productName: m.produit_nom || '',
  type: (m.type === 'entree' ? 'entry' : 'exit') as 'entry' | 'exit',
  quantity: Number(m.quantite) || 0,
  date: m.date_mouvement ? String(m.date_mouvement).split('T')[0] : '',
  comment: m.commentaire || '',
  companyId: String(m.entreprise_id || ''),
});

function mapHistoriqueType(type_action: string): string {
  if (type_action === 'entree_stock') return 'entry';
  if (type_action === 'sortie_stock') return 'exit';
  if (type_action === 'modification_prix') return 'price_change';
  if (type_action.startsWith('creation')) return 'product_add';
  if (type_action.startsWith('suppression')) return 'product_delete';
  return 'entry';
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: number;
  nom: string;
  email: string;
  role: string;
  entreprise_id: number;
  entreprise_nom: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; data: { token: string; user: ApiUser } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ success: boolean; data: ApiUser }>('/auth/me'),
};

// ── CLIENTS ───────────────────────────────────────────────────────────────────
interface ContactForm { name: string; phone: string; address: string; email: string; }

export const clientsApi = {
  list: async (search = '') => {
    const p = new URLSearchParams({ limit: '100' });
    if (search) p.set('search', search);
    const res = await request<any>(`/clients?${p}`);
    return (res.data as any[]).map(mapContact);
  },
  create: (d: ContactForm) =>
    request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify({ nom: d.name, telephone: d.phone, adresse: d.address, email: d.email }),
    }),
  update: (id: string, d: ContactForm) =>
    request<any>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nom: d.name, telephone: d.phone, adresse: d.address, email: d.email }),
    }),
  delete: (id: string) => request<any>(`/clients/${id}`, { method: 'DELETE' }),
};

// ── FOURNISSEURS ──────────────────────────────────────────────────────────────
export const fournisseursApi = {
  list: async (search = '') => {
    const p = new URLSearchParams({ limit: '100' });
    if (search) p.set('search', search);
    const res = await request<any>(`/fournisseurs?${p}`);
    return (res.data as any[]).map(mapContact);
  },
  create: (d: ContactForm) =>
    request<any>('/fournisseurs', {
      method: 'POST',
      body: JSON.stringify({ nom: d.name, telephone: d.phone, adresse: d.address, email: d.email }),
    }),
  update: (id: string, d: ContactForm) =>
    request<any>(`/fournisseurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nom: d.name, telephone: d.phone, adresse: d.address, email: d.email }),
    }),
  delete: (id: string) => request<any>(`/fournisseurs/${id}`, { method: 'DELETE' }),
};

// ── PRODUITS ──────────────────────────────────────────────────────────────────
export interface ApiCategory { id: number; nom: string; }

export const produitsApi = {
  list: async (search = '', categorieId = '') => {
    const p = new URLSearchParams({ limit: '100' });
    if (search) p.set('search', search);
    if (categorieId) p.set('categorie_id', categorieId);
    const res = await request<any>(`/produits?${p}`);
    return (res.data as any[]).map(mapProduct);
  },
  categories: async () => {
    const res = await request<any>('/produits/categories');
    return res.data as ApiCategory[];
  },
  create: (d: {
    nom: string; categorie_id?: number | null;
    prix_achat: number; prix_vente: number;
    stock_actuel?: number; stock_minimum?: number; unite?: string;
  }) => request<any>('/produits', { method: 'POST', body: JSON.stringify(d) }),
  update: (id: string, d: {
    nom: string; categorie_id?: number | null;
    prix_achat: number; prix_vente: number;
    stock_minimum?: number; unite?: string;
  }) => request<any>(`/produits/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete: (id: string) => request<any>(`/produits/${id}`, { method: 'DELETE' }),
};

// ── INVENTAIRE ────────────────────────────────────────────────────────────────
export const inventaireApi = {
  list: async (type?: string) => {
    const p = new URLSearchParams({ limit: '100' });
    if (type && type !== 'all') p.set('type', type === 'entry' ? 'entree' : 'sortie');
    const res = await request<any>(`/inventaire?${p}`);
    return (res.data as any[]).map(mapMovement);
  },
  entree: (d: { produit_id: number; quantite: number; commentaire?: string }) =>
    request<any>('/inventaire/entree', { method: 'POST', body: JSON.stringify(d) }),
  sortie: (d: { produit_id: number; quantite: number; commentaire?: string }) =>
    request<any>('/inventaire/sortie', { method: 'POST', body: JSON.stringify(d) }),
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => request<any>('/dashboard/stats'),
  graphique: (periode = 30) => request<any>(`/dashboard/graphique?periode=${periode}`),
};

// ── HISTORIQUE ────────────────────────────────────────────────────────────────
export const historiqueApi = {
  list: async (typeAction = '') => {
    const p = new URLSearchParams({ limit: '100' });
    if (typeAction && typeAction !== 'all') p.set('type_action', typeAction);
    const res = await request<any>(`/historique?${p}`);
    return (res.data as any[]).map((h: any) => ({
      id: String(h.id),
      type: mapHistoriqueType(h.type_action),
      description: h.description || '',
      date: h.created_at || '',
      productName: h.entite_type === 'produit' ? h.description : undefined,
      companyId: String(h.entreprise_id || ''),
    }));
  },
};
