import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-2">
          Configurações do painel administrativo
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Admin</CardTitle>
            <CardDescription>
              Preferências e opções do painel. Em breve.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </motion.div>
    </div>
  );
}
