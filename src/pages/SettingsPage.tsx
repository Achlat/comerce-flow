import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground text-sm">Gérez votre compte et votre entreprise</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input defaultValue={user?.name} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue={user?.email} type="email" />
          </div>
          <div className="flex items-center gap-2">
            <Label>Rôle</Label>
            <Badge variant="secondary">{user?.role === 'admin' ? 'Administrateur' : 'Employé'}</Badge>
          </div>
          <Button>Enregistrer</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Entreprise</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de l'entreprise</Label>
            <Input defaultValue={user?.companyName} />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Input defaultValue="FCFA" disabled />
          </div>
          <Button>Enregistrer</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sécurité</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mot de passe actuel</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <Button>Changer le mot de passe</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
