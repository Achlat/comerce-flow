import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { produitsApi, ApiCategory } from '@/lib/api';
import { formatFCFA } from '@/lib/format';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
}

const emptyForm = { name: '', categoryId: '', purchasePrice: 0, salePrice: 0, stock: 0, minStock: 5 };

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prods, cats] = await Promise.all([produitsApi.list(), produitsApi.categories()]);
      setProducts(prods as any[]);
      setCategories(cats);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() =>
    products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCat === 'all' || p.categoryId === filterCat;
      return matchSearch && matchCat;
    }), [products, search, filterCat]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, categoryId: p.categoryId, purchasePrice: p.purchasePrice, salePrice: p.salePrice, stock: p.stock, minStock: p.minStock });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nom: form.name,
        categorie_id: form.categoryId ? Number(form.categoryId) : null,
        prix_achat: form.purchasePrice,
        prix_vente: form.salePrice,
        stock_minimum: form.minStock,
      };
      if (editing) {
        await produitsApi.update(editing.id, payload);
      } else {
        await produitsApi.create({ ...payload, stock_actuel: form.stock });
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await produitsApi.delete(deleteId);
      setDeleteId(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produits</h1>
          <p className="text-muted-foreground text-sm">{products.length} produits enregistrés</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Prix achat</TableHead>
                    <TableHead className="text-right">Prix vente</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.name}
                          {p.stock <= p.minStock && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              <AlertTriangle className="w-3 h-3 mr-1" />Faible
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{p.category || '—'}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{formatFCFA(p.purchasePrice)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatFCFA(p.salePrice)}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun produit trouvé</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Prix d'achat (FCFA)</Label><Input type="number" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: +e.target.value }))} /></div>
              <div className="space-y-2"><Label>Prix de vente (FCFA)</Label><Input type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: +e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {!editing && (
                <div className="space-y-2"><Label>Stock initial</Label><Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: +e.target.value }))} /></div>
              )}
              <div className="space-y-2"><Label>Stock minimum</Label><Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: +e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProductsPage;
