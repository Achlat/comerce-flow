import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type Status = { type: 'success' | 'error'; message: string } | null;

const DEVISES = ['FCFA', 'EUR', 'USD', 'MAD', 'XOF', 'DZD', 'TND', 'GNF', 'MRO'];

const SettingsPage = () => {
  const { user, updateUser } = useAuth();

  // ── Profil
  const [profil, setProfil] = useState({ nom: user?.name || '', email: user?.email || '' });
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilStatus, setProfilStatus] = useState<Status>(null);

  const handleSaveProfil = async () => {
    if (!profil.nom.trim() || !profil.email.trim()) return;
    setProfilLoading(true);
    setProfilStatus(null);
    try {
      await authApi.updateProfile(profil.nom.trim(), profil.email.trim());
      updateUser({ name: profil.nom.trim(), email: profil.email.trim() });
      setProfilStatus({ type: 'success', message: 'Profil mis à jour avec succès' });
    } catch (e: any) {
      setProfilStatus({ type: 'error', message: e.message || 'Erreur lors de la mise à jour' });
    } finally {
      setProfilLoading(false);
    }
  };

  // ── Entreprise
  const [entreprise, setEntreprise] = useState({
    nom: user?.companyName || '',
    devise: user?.devise || 'FCFA',
  });
  const [entrepriseLoading, setEntrepriseLoading] = useState(false);
  const [entrepriseStatus, setEntrepriseStatus] = useState<Status>(null);

  const handleSaveEntreprise = async () => {
    if (!entreprise.nom.trim()) return;
    setEntrepriseLoading(true);
    setEntrepriseStatus(null);
    try {
      await authApi.updateEntreprise(entreprise.nom.trim(), entreprise.devise);
      updateUser({ companyName: entreprise.nom.trim(), devise: entreprise.devise });
      setEntrepriseStatus({ type: 'success', message: 'Entreprise mise à jour avec succès' });
    } catch (e: any) {
      setEntrepriseStatus({ type: 'error', message: e.message || 'Erreur lors de la mise à jour' });
    } finally {
      setEntrepriseLoading(false);
    }
  };

  // ── Mot de passe
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '', confirmer: '' });
  const [mdpLoading, setMdpLoading] = useState(false);
  const [mdpStatus, setMdpStatus] = useState<Status>(null);

  const handleChangePassword = async () => {
    if (!mdp.ancien || !mdp.nouveau || !mdp.confirmer) {
      setMdpStatus({ type: 'error', message: 'Tous les champs sont requis' });
      return;
    }
    if (mdp.nouveau !== mdp.confirmer) {
      setMdpStatus({ type: 'error', message: 'Les mots de passe ne correspondent pas' });
      return;
    }
    if (mdp.nouveau.length < 8) {
      setMdpStatus({ type: 'error', message: 'Le nouveau mot de passe doit faire au moins 8 caractères' });
      return;
    }
    setMdpLoading(true);
    setMdpStatus(null);
    try {
      await authApi.changePassword(mdp.ancien, mdp.nouveau);
      setMdp({ ancien: '', nouveau: '', confirmer: '' });
      setMdpStatus({ type: 'success', message: 'Mot de passe modifié avec succès' });
    } catch (e: any) {
      setMdpStatus({ type: 'error', message: e.message || 'Erreur lors du changement' });
    } finally {
      setMdpLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground text-sm">Gérez votre compte et votre entreprise</p>
      </div>

      {/* ── Profil ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              value={profil.nom}
              onChange={e => setProfil(p => ({ ...p, nom: e.target.value }))}
              placeholder="Votre nom"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={profil.email}
              onChange={e => setProfil(p => ({ ...p, email: e.target.value }))}
              placeholder="votre@email.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label>Rôle</Label>
            <Badge variant="secondary">{user?.role === 'admin' ? 'Administrateur' : 'Employé'}</Badge>
          </div>
          {profilStatus && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${profilStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {profilStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {profilStatus.message}
            </div>
          )}
          <Button onClick={handleSaveProfil} disabled={profilLoading}>
            {profilLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* ── Entreprise ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Entreprise</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de l'entreprise</Label>
            <Input
              value={entreprise.nom}
              onChange={e => setEntreprise(p => ({ ...p, nom: e.target.value }))}
              placeholder="Nom de votre entreprise"
              disabled={user?.role !== 'admin'}
            />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Select
              value={entreprise.devise}
              onValueChange={val => setEntreprise(p => ({ ...p, devise: val }))}
              disabled={user?.role !== 'admin'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une devise" />
              </SelectTrigger>
              <SelectContent>
                {DEVISES.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {user?.role !== 'admin' && (
            <p className="text-xs text-muted-foreground">Seul l'administrateur peut modifier l'entreprise.</p>
          )}
          {entrepriseStatus && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${entrepriseStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {entrepriseStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {entrepriseStatus.message}
            </div>
          )}
          {user?.role === 'admin' && (
            <Button onClick={handleSaveEntreprise} disabled={entrepriseLoading}>
              {entrepriseLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Sécurité ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Sécurité</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mot de passe actuel</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={mdp.ancien}
              onChange={e => setMdp(p => ({ ...p, ancien: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={mdp.nouveau}
              onChange={e => setMdp(p => ({ ...p, nouveau: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmer le nouveau mot de passe</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={mdp.confirmer}
              onChange={e => setMdp(p => ({ ...p, confirmer: e.target.value }))}
            />
          </div>
          {mdpStatus && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${mdpStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {mdpStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {mdpStatus.message}
            </div>
          )}
          <Button onClick={handleChangePassword} disabled={mdpLoading}>
            {mdpLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
