import React, { useState, useEffect } from 'react';
import { dashboardApi } from '@/lib/api';
import { formatFCFA } from '@/lib/format';
import { Package, TrendingUp, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface LowStockItem { id: number; nom: string; stock_actuel: number; stock_minimum: number; }

interface Stats {
  nb_produits: number;
  valeur_stock_achat: number;
  entrees_jour: { total_quantite: number };
  sorties_jour: { total_quantite: number };
  alertes_stock_faible: LowStockItem[];
}

interface ChartPoint { jour: string; entrees: number; sorties: number; }

const DashboardPage = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, chartRes] = await Promise.all([
          dashboardApi.stats(),
          dashboardApi.graphique(30),
        ]);
        setStats(statsRes.data);
        setChartData(chartRes.data.map((d: any) => ({
          date: d.jour,
          entries: d.entrees,
          exits: d.sorties,
        })));
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>;
  }

  const statCards = [
    { label: 'Produits', value: stats?.nb_produits ?? 0, icon: Package, color: 'text-primary' },
    { label: 'Valeur du stock', value: formatFCFA(stats?.valeur_stock_achat ?? 0), icon: TrendingUp, color: 'text-secondary' },
    { label: 'Entrées du jour', value: stats?.entrees_jour?.total_quantite ?? 0, icon: ArrowDownToLine, color: 'text-success' },
    { label: 'Sorties du jour', value: stats?.sorties_jour?.total_quantite ?? 0, icon: ArrowUpFromLine, color: 'text-destructive' },
  ];

  const lowStock = stats?.alertes_stock_faible ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="stat-card-shadow animate-slide-up">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-card-foreground mt-1">{s.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-muted ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Entrées & Sorties (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="entries" fill="hsl(var(--chart-entry))" name="Entrées" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exits" fill="hsl(var(--chart-exit))" name="Sorties" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Stock faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune alerte</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{p.nom}</p>
                      <p className="text-xs text-muted-foreground">Min: {p.stock_minimum}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {p.stock_actuel} restant{p.stock_actuel > 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
