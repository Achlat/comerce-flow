import React, { useState, useEffect, useMemo } from 'react';
import { historiqueApi } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Clock, ArrowDownToLine, ArrowUpFromLine, DollarSign, PackagePlus, Trash2, Download, Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  entry: { label: 'Entrée', icon: ArrowDownToLine, color: 'text-success' },
  exit: { label: 'Sortie', icon: ArrowUpFromLine, color: 'text-destructive' },
  price_change: { label: 'Prix', icon: DollarSign, color: 'text-secondary' },
  product_add: { label: 'Ajout', icon: PackagePlus, color: 'text-primary' },
  product_delete: { label: 'Suppression', icon: Trash2, color: 'text-destructive' },
};

interface HistoryEntry {
  id: string;
  type: string;
  description: string;
  date: string;
  productName?: string;
}

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    historiqueApi.list()
      .then(data => setHistory(data as any[]))
      .catch(e => setError(e.message || 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    history
      .filter(h => {
        const matchSearch = h.description.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || h.type === filterType;
        return matchSearch && matchType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [history, search, filterType]
  );

  const handleExport = (format: 'pdf' | 'xlsx') => {
    alert(`Export ${format.toUpperCase()} sera disponible prochainement`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historique</h1>
          <p className="text-muted-foreground text-sm">Toutes les opérations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
            <Download className="w-4 h-4 mr-2" />XLSX
          </Button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="entry">Entrées stock</SelectItem>
                <SelectItem value="exit">Sorties stock</SelectItem>
                <SelectItem value="price_change">Changements de prix</SelectItem>
                <SelectItem value="product_add">Créations</SelectItem>
                <SelectItem value="product_delete">Suppressions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => {
            const config = typeConfig[h.type] || typeConfig.entry;
            const Icon = config.icon;
            return (
              <Card key={h.id} className="animate-slide-up">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={cn('p-2.5 rounded-xl bg-muted', config.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{h.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDateTime(h.date)}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">{config.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Aucun résultat</div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
