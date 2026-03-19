import { MessageSquareQuote } from 'lucide-react';
import { AdminPageHeader } from '@/admin/components/AdminPageHeader';
import { AdminBigBox } from '@/admin/components/AdminBigBox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={MessageSquareQuote}
        title="Avaliações"
        description="Gerencie as avaliações dos apps pelos usuários."
      />
      <AdminBigBox>
        <Card>
          <CardHeader>
            <CardTitle>Avaliações</CardTitle>
            <CardDescription>Em breve: ranking e gestão de avaliações dos sistemas.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Esta área exibirá as avaliações dos aplicativos e permitirá análises e relatórios.
            </p>
          </CardContent>
        </Card>
      </AdminBigBox>
    </div>
  );
}
