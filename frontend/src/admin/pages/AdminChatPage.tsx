import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export default function AdminChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <MessageCircle className="w-8 h-8" />
          Chat
        </h1>
        <p className="text-muted-foreground mt-2">
          Moderação e visão do chat
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>
              Acesso administrativo ao chat. Em breve.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </motion.div>
    </div>
  );
}
