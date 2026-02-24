import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { inventaireApi, produitsApi } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Movement {
  id: string;
  productId: string;
  productName: string;
  type: 'entry' | 'exit';
  quantity: number;
  date: string;
  comment?: string;
}

interface Product { id: string; name: string; }

const InventoryPage = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('entry');
  const [tab, setTab] = useState('all');
  const [form, setForm] = useState({ productId: '', quantity: 0, comment: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [movs, prods] = await Promise.all([inventaireApi.list(), produitsApi.list()]);
      setMovements(movs as any[]);
      setProducts(prods as any[]);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (tab === 'all') return movements;
    return movements.filter(m => m.type === tab);
  }, [movements, tab]);

  const openDialog = (type: 'entry' | 'exit') => {
    setMovementType(type);
    setForm({ productId: '', quantity: 0, comment: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.productId || form.quantity <= 0) return;
    setSaving(true);
    try {
      const payload = {
        produit_id: Number(form.productId),
        quantite: form.quantity,
        commentaire: form.comment || undefined,
      };
      if (movementType === 'entry') {
        await inventaireApi.entree(payload);
      } else {
        await inventaireApi.sortie(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventaire</h1>
          <p className="text-muted-foreground text-sm">Entrées et sorties de stock</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openDialog('entry')} className="bg-success text-success-foreground hover:bg-success/90">
            <ArrowDownToLine className="w-4 h-4 mr-2" />Entrée
          </Button>
          <Button onClick={() => openDialog('exit')} variant="destructive">
            <ArrowUpFromLine className="w-4 h-4 mr-2" />Sortie
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Tout</TabsTrigger>
          <TabsTrigger value="entry">Entrées</TabsTrigger>
          <TabsTrigger value="exit">Sorties</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge className={cn(
                          'text-xs',
                          m.type === 'entry' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                        )} variant="outline">
                          {m.type === 'entry' ? '↓ Entrée' : '↑ Sortie'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{m.productName}</TableCell>
                      <TableCell className={cn('text-right font-semibold', m.type === 'entry' ? 'text-success' : 'text-destructive')}>
                        {m.type === 'entry' ? '+' : '-'}{m.quantity}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(m.date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.comment || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun mouvement</TableCell></TableRow>
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
            <DialogTitle>{movementType === 'entry' ? 'Nouvelle entrée' : 'Nouvelle sortie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Produit *</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantité *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} /></div>
            <div className="space-y-2"><Label>Commentaire</Label><Textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="Optionnel..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className={movementType === 'entry' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {movementType === 'entry' ? 'Enregistrer entrée' : 'Enregistrer sortie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;
