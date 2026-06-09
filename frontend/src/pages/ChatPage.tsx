import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { databaseService, chatService } from '@/services/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Send,
  UserPlus,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingGif } from '@/components/LoadingGif';
import type { Conversation, ChatMessage } from '@/types';
import type { User } from '@/types';

export default function ChatPage() {
  const { user: currentUser } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof chatService.subscribeToMessages> | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!selectedConversation?.id || !currentUser?.id) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    chatService.getMessages(selectedConversation.id).then(({ data, error }) => {
      setLoadingMessages(false);
      if (!error) setMessages(data || []);
    });
    const channel = chatService.subscribeToMessages(selectedConversation.id, (payload: any) => {
      const newMsg = payload.new as ChatMessage;
      setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
    });
    channelRef.current = channel;
    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [selectedConversation?.id, currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!currentUser?.id) return;
    setLoadingConversations(true);
    const { data, error } = await chatService.getConversations(currentUser.id);
    setLoadingConversations(false);
    if (!error && data) setConversations(data);
  };

  const openNewChat = async () => {
    setNewChatOpen(true);
    const { data } = await databaseService.getUsers();
    const list: User[] = (data || [])
      .filter((u: any) => u.id !== currentUser?.id)
      .map((u: any) => ({
        id: u.id,
        name: u.name || 'Sem nome',
        email: u.email || '',
        role: u.role,
        avatar: u.avatar,
        createdAt: new Date(u.created_at),
      }));
    setUsers(list);
  };

  const startConversationWith = async (other: User) => {
    if (!currentUser?.id) return;
    const { data: conv, error } = await chatService.getOrCreateConversation(currentUser.id, other.id);
    setNewChatOpen(false);
    setUserSearch('');
    if (error || !conv) return;
    const withParticipants: Conversation = {
      ...conv,
      participants: [{ id: other.id, name: other.name, email: other.email, avatar: other.avatar }],
    };
    setConversations((prev) => [withParticipants, ...prev.filter((c) => c.id !== conv.id)]);
    setSelectedConversation(withParticipants);
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !selectedConversation?.id || !currentUser?.id || sending) return;
    setSending(true);
    setInputText('');
    const { data, error } = await chatService.sendMessage(
      selectedConversation.id,
      currentUser.id,
      text
    );
    setSending(false);
    if (!error && data) setMessages((prev) => [...prev, data]);
  };

  const otherParticipant = selectedConversation?.participants?.[0];
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-primary" />
          Chat
        </h1>
        <Button onClick={openNewChat} className="gap-2" size="sm">
          <UserPlus className="w-4 h-4" />
          Nova conversa
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 border rounded-xl bg-card/50 overflow-hidden">
        {/* Lista de conversas */}
        <div
          className={cn(
            'flex flex-col border-r bg-muted/30 min-h-0',
            selectedConversation ? 'hidden md:flex w-full md:w-80 shrink-0' : 'w-full md:w-80 shrink-0'
          )}
        >
          {selectedConversation && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden gap-2 m-2"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          {loadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <LoadingGif size="lg" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Nenhuma conversa ainda. Clique em &quot;Nova conversa&quot; para falar com alguém.
            </div>
          ) : (
            <ul className="overflow-y-auto flex-1 p-2">
              {conversations.map((conv) => {
                const other = conv.participants?.[0];
                const name = other?.name || 'Usuário';
                const last = conv.last_message;
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors',
                        isSelected ? 'bg-primary/15 text-foreground' : 'hover:bg-muted/80'
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {other?.avatar ? (
                          <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-primary">
                            {name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {last?.content || 'Sem mensagens'}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Área da conversa */}
        <AnimatePresence mode="wait">
          {selectedConversation ? (
            <motion.div
              key={selectedConversation.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0 min-w-0"
            >
              <div className="p-3 border-b flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                  {otherParticipant?.avatar ? (
                    <img
                      src={otherParticipant.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      {otherParticipant?.name?.slice(0, 1).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{otherParticipant?.name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {otherParticipant?.email}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <LoadingGif size="md" />
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          isMe ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                            isMe
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="p-3 border-t flex gap-2 shrink-0"
              >
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button type="submit" size="icon" disabled={sending || !inputText.trim()}>
                  {sending ? (
                    <LoadingGif size="sm" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center text-muted-foreground p-8 md:flex hidden"
            >
              <div className="text-center max-w-sm">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Selecione uma conversa</p>
                <p className="text-sm mt-1">
                  Ou inicie uma nova conversa com outro usuário (mock).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal nova conversa */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
            <DialogDescription>
              Escolha um usuário para iniciar a conversa (mock).
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-2 group/search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="pl-9 h-10 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto mt-4 space-y-1">
            {filteredUsers.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => startConversationWith(u)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        {u.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {filteredUsers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum usuário encontrado.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
