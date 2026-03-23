import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Megaphone,
  Search,
  Filter,
  ChevronDown,
  Plus,
  AlertCircle,
  Type,
  ImagePlus,
  AlignLeft,
  Tag,
  Tags,
  Maximize2,
  SmilePlus,
  MessageCircle,
  CalendarDays,
  Clock8,
  MapPin,
  Send,
  Trash2,
  MessageCircleMore,
  MoreVertical,
  Pencil,
  Archive,
} from 'lucide-react';
import { AnimatedEmoji } from '@/components/ui/animated-emoji';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  storageService,
  databaseService,
  type Statement,
  type StatementReaction,
  type StatementReactionWithUser,
  type StatementCommentWithUser,
} from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import { emitCommunicadosUnreadChanged } from '@/lib/communicadosEvents';
import { LoadingGif, LoadingGifScreen } from '@/components/LoadingGif';
import { cn } from '@/lib/utils';
import StatementReactionPicker from '@/components/statement/StatementReactionPicker';
import { getAllCollaboratorsNeonMeta } from '@/services/corporateProfile';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';

const TAG_FILTER_ALL = 'all';

/** Acima disto, mostramos "Ler mais" no card (legenda colapsada ~3 linhas). */
const CAPTION_COLLAPSE_CHARS = 140;
const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/initials/svg?seed=GeApps';

type StatementReactionSummary = {
  uniqueEmojis: string[];
  total: number;
};

type ReactionViewer = {
  userId: string;
  userName: string;
  userAvatar?: string;
  department?: string;
  reaction: string;
};

function formatPublishedAt(d: Date) {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Data/hora numérica, uma linha (evita quebra no card). */
function formatPublishedAtOneLine(d: Date) {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statementAvatarUrl(s: Statement) {
  const u = s.creatorAvatarUrl?.trim();
  if (u) return u;
  const seed = encodeURIComponent((s.creatorName || s.userId || 'G').slice(0, 48));
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}

export default function ComunicadosPage() {
  const { pathname } = useLocation();
  const isAdminPanel = pathname.startsWith('/admin/');
  const user = useAuthStore((s) => s.user);
  const canCreateStatements = user?.accessType === 'admin' || user?.accessType === 'creator' || isAdminPanel;

  const canManageStatement = useCallback(
    (s: Statement) => {
      if (!user?.id) return false;
      if (isAdminPanel || user.accessType === 'admin' || user.role === 'admin') return true;
      if (canCreateStatements && s.userId === user.id) return true;
      return false;
    },
    [user, isAdminPanel, canCreateStatements]
  );

  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>(TAG_FILTER_ALL);
  const [captionExpanded, setCaptionExpanded] = useState<Record<string, boolean>>({});
  const [detailStatement, setDetailStatement] = useState<Statement | null>(null);
  const [statementReactions, setStatementReactions] = useState<StatementReaction[]>([]);
  const [commentCountByStatementId, setCommentCountByStatementId] = useState<Map<string, number>>(new Map());
  const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);
  const [reactionsModalTitle, setReactionsModalTitle] = useState('');
  const [reactionsModalStatementId, setReactionsModalStatementId] = useState<string | null>(null);
  const [reactionsModalLoading, setReactionsModalLoading] = useState(false);
  const [reactionsModalItems, setReactionsModalItems] = useState<ReactionViewer[]>([]);
  const [reactionsProfilePopupOpen, setReactionsProfilePopupOpen] = useState(false);
  const [reactionsProfileUserData, setReactionsProfileUserData] = useState<any>(null);
  const [reactionsProfileLoadingId, setReactionsProfileLoadingId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef('');

  const [editStatement, setEditStatement] = useState<Statement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editTagsRaw, setEditTagsRaw] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editPreviewUrlRef = useRef('');

  const tagOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of statements) {
      for (const t of s.tags) {
        const n = t.trim();
        if (n && !seen.has(n)) {
          seen.add(n);
          list.push(n);
        }
      }
    }
    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [statements]);

  const filterLabel = tagFilter === TAG_FILTER_ALL ? 'Todas as tags' : tagFilter;

  const reactionsByStatementId = useMemo(() => {
    const map = new Map<string, StatementReaction[]>();
    for (const item of statementReactions) {
      if (!item.isActive || item.deletedAt) continue;
      const bucket = map.get(item.statementId);
      if (bucket) bucket.push(item);
      else map.set(item.statementId, [item]);
    }
    return map;
  }, [statementReactions]);

  const reactionSummaryByStatementId = useMemo(() => {
    const out = new Map<string, StatementReactionSummary>();
    for (const [statementId, rows] of reactionsByStatementId.entries()) {
      const uniqueEmojis = [...new Set(rows.map((r) => (r.reaction ?? '').trim()).filter(Boolean))];
      const total = rows.filter((r) => !!(r.reaction ?? '').trim()).length;
      out.set(statementId, { uniqueEmojis, total });
    }
    return out;
  }, [reactionsByStatementId]);

  const myReactionByStatementId = useMemo(() => {
    const out = new Map<string, string | null>();
    for (const row of statementReactions) {
      if (row.userId !== user?.id || !row.isActive || row.deletedAt) continue;
      out.set(row.statementId, row.reaction ?? null);
    }
    return out;
  }, [statementReactions, user?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await databaseService.listStatements();
    const statementsList = data ?? [];
    setStatements(statementsList);
    const statementIds = statementsList.map((s) => s.id);
    const { data: reactionsData } = await databaseService.listStatementReactions(statementIds);
    setStatementReactions(reactionsData ?? []);

    // Buscar contagem de comentários para todos os posts
    const countMap = new Map<string, number>();
    await Promise.all(
      statementIds.map(async (id) => {
        const { data: cmts } = await databaseService.listStatementComments(id);
        countMap.set(id, cmts?.length ?? 0);
      })
    );
    setCommentCountByStatementId(new Map(countMap));

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (tagFilter !== TAG_FILTER_ALL && !tagOptions.includes(tagFilter)) {
      setTagFilter(TAG_FILTER_ALL);
    }
  }, [tagOptions, tagFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return statements.filter((s) => {
      const tagsJoined = s.tags.join(' ').toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        (s.caption ?? '').toLowerCase().includes(q) ||
        tagsJoined.includes(q);
      const matchTag =
        tagFilter === TAG_FILTER_ALL || s.tags.some((t) => t.trim() === tagFilter);
      return matchSearch && matchTag;
    });
  }, [statements, searchQuery, tagFilter]);

  const resetForm = useCallback(() => {
    setTitle('');
    setCaption('');
    setTagsRaw('');
    setImageFile(null);
    setFormError('');
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      previewUrlRef.current = '';
      return '';
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  useEffect(() => {
    previewUrlRef.current = imagePreviewUrl;
  }, [imagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    editPreviewUrlRef.current = editImagePreview;
  }, [editImagePreview]);

  useEffect(() => {
    return () => {
      if (editPreviewUrlRef.current && editPreviewUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(editPreviewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editStatement) {
      setEditTitle('');
      setEditCaption('');
      setEditTagsRaw('');
      setEditImageFile(null);
      setEditImagePreview('');
      setEditFormError('');
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }
    setEditTitle(editStatement.title);
    setEditCaption(editStatement.caption ?? '');
    setEditTagsRaw(editStatement.tags.join(', '));
    setEditImageFile(null);
    setEditImagePreview(editStatement.imageUrl);
    setEditFormError('');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  }, [editStatement]);

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFormError('');
    if (!f) {
      setImageFile(null);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
      return;
    }
    if (!f.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem (PNG, JPG, etc.).');
      e.target.value = '';
      setImageFile(null);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
      return;
    }
    setImageFile(f);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const handleCreate = async () => {
    setFormError('');
    if (!canCreateStatements) {
      setFormError('Você não tem permissão para criar comunicados.');
      return;
    }
    if (!title.trim()) {
      setFormError('Informe o título.');
      return;
    }
    if (!imageFile) {
      setFormError('Selecione uma imagem para o comunicado.');
      return;
    }
    if (!user?.id) {
      setFormError('Sessão inválida. Faça login novamente.');
      return;
    }

    setFormLoading(true);
    const { url, error: upErr } = await storageService.uploadComunicadoImage(imageFile, user.id);
    if (upErr || !url) {
      setFormLoading(false);
      const msg =
        upErr && typeof upErr === 'object' && 'message' in upErr
          ? String((upErr as { message: string }).message)
          : 'Não foi possível enviar a imagem. Verifique o bucket GeComunicado e as políticas de storage.';
      setFormError(msg);
      return;
    }

    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const { data: created, error: dbErr } = await databaseService.createStatement({
      title: title.trim(),
      image_url: url,
      caption: caption.trim() || null,
      tags,
      user_id: user.id,
      creator_name: user.name?.trim() || null,
    });
    setFormLoading(false);

    if (dbErr || !created) {
      const msg =
        dbErr && typeof dbErr === 'object' && 'message' in dbErr
          ? String((dbErr as { message: string }).message)
          : 'Não foi possível salvar o comunicado. Verifique a tabela statement e as políticas RLS.';
      setFormError(msg);
      return;
    }

    toast.success('Comunicado publicado', {
      description: created.title,
    });
    setIsCreateOpen(false);
    resetForm();
    await loadData();
    emitCommunicadosUnreadChanged();
  };

  const onEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setEditFormError('');
    if (!f) {
      setEditImageFile(null);
      setEditImagePreview((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return editStatement?.imageUrl ?? '';
      });
      return;
    }
    if (!f.type.startsWith('image/')) {
      setEditFormError('Selecione um arquivo de imagem (PNG, JPG, etc.).');
      e.target.value = '';
      return;
    }
    setEditImageFile(f);
    setEditImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const handleEditSave = async () => {
    if (!editStatement || !user?.id) return;
    setEditFormError('');
    if (!editTitle.trim()) {
      setEditFormError('Informe o título.');
      return;
    }

    setEditLoading(true);
    let imageUrl = editStatement.imageUrl;
    if (editImageFile) {
      const { url, error: upErr } = await storageService.uploadComunicadoImage(editImageFile, user.id);
      if (upErr || !url) {
        setEditLoading(false);
        setEditFormError(
          upErr && typeof upErr === 'object' && 'message' in upErr
            ? String((upErr as { message: string }).message)
            : 'Não foi possível enviar a imagem.'
        );
        return;
      }
      imageUrl = url;
    }

    const tags = editTagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const { error: dbErr } = await databaseService.updateStatement(editStatement.id, {
      title: editTitle.trim(),
      image_url: imageUrl,
      caption: editCaption.trim() || null,
      tags,
    });
    setEditLoading(false);

    if (dbErr) {
      const msg =
        dbErr && typeof dbErr === 'object' && 'message' in dbErr
          ? String((dbErr as { message: string }).message)
          : 'Não foi possível atualizar o comunicado.';
      setEditFormError(msg);
      return;
    }

    toast.success('Comunicado atualizado');
    setEditStatement(null);
    await loadData();
    setDetailStatement((prev) =>
      prev?.id === editStatement.id
        ? {
            ...prev,
            title: editTitle.trim(),
            imageUrl,
            caption: editCaption.trim() || undefined,
            tags,
          }
        : prev
    );
  };

  const handleArchiveStatement = async (s: Statement) => {
    if (!window.confirm('Arquivar este comunicado? Ele deixará de aparecer na lista para todos.')) return;
    const { error } = await databaseService.updateStatement(s.id, { is_archived: true });
    if (error) {
      toast.error(
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível arquivar.'
      );
      return;
    }
    toast.success('Comunicado arquivado');
    setDetailStatement((prev) => (prev?.id === s.id ? null : prev));
    await loadData();
    emitCommunicadosUnreadChanged();
  };

  const handleDeleteStatement = async (s: Statement) => {
    if (!window.confirm('Excluir este comunicado permanentemente? Esta ação não pode ser desfeita.')) return;
    const { error } = await databaseService.deleteStatement(s.id);
    if (error) {
      toast.error(
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível excluir.'
      );
      return;
    }
    toast.success('Comunicado excluído');
    setDetailStatement((prev) => (prev?.id === s.id ? null : prev));
    await loadData();
    emitCommunicadosUnreadChanged();
  };

  const [comments, setComments] = useState<StatementCommentWithUser[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadComments = useCallback(async (statementId: string) => {
    setCommentsLoading(true);
    const { data } = await databaseService.listStatementComments(statementId);
    setComments(data || []);
    setCommentsLoading(false);
  }, []);

  const handleAddComment = async () => {
    if (!detailStatement || !newComment.trim()) return;
    
    setSubmittingComment(true);
    const { data, error } = await databaseService.addStatementComment(detailStatement.id, newComment);
    setSubmittingComment(false);
    
    if (error) {
      toast.error('Erro ao adicionar comentário');
      return;
    }
    
    if (data) {
      setNewComment('');
      // Recarregar comentários para obter os dados do usuário (nome, avatar)
      loadComments(detailStatement.id);
      // Atualizar o contador no card
      setCommentCountByStatementId(prev => {
        const next = new Map(prev);
        next.set(detailStatement.id, (prev.get(detailStatement.id) ?? 0) + 1);
        return next;
      });
      toast.success('Comentário adicionado!');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!detailStatement) return;
    
    const { error } = await databaseService.deleteStatementComment(commentId);
    if (error) {
      toast.error('Erro ao excluir comentário');
      return;
    }
    
    setComments(prev => prev.filter(c => c.id !== commentId));
    // Atualizar o contador no card
    if (detailStatement) {
      setCommentCountByStatementId(prev => {
        const next = new Map(prev);
        next.set(detailStatement.id, Math.max(0, (prev.get(detailStatement.id) ?? 1) - 1));
        return next;
      });
    }
    toast.success('Comentário excluído');
  };

  const handleOpenPost = (s: Statement) => {
    setDetailStatement({ ...s, viewed: true });
    loadComments(s.id);
    setStatements((prev) => prev.map((x) => (x.id === s.id ? { ...x, viewed: true } : x)));
    emitCommunicadosUnreadChanged();
    void databaseService.markStatementViewed(s.id).then(({ error }) => {
      if (error) {
        setStatements((prev) => prev.map((x) => (x.id === s.id ? { ...x, viewed: false } : x)));
        setDetailStatement((prev) => (prev?.id === s.id ? { ...prev, viewed: false } : prev));
        emitCommunicadosUnreadChanged();
        toast.error('Não foi possível registar a visualização.');
        return;
      }
      void loadData();
    });
  };

  const handleReactToStatement = useCallback(
    async (statementId: string, reaction: string | null) => {
      if (!user?.id) {
        toast.error('Sessão inválida. Faça login novamente.');
        return;
      }

      const nextReaction = reaction && reaction.trim() ? reaction.trim() : null;

      // Atualização otimista: reflete imediatamente no card, no "Sua reação"
      // e na lista de reagentes no modal (quando aberto no mesmo post).
      setStatementReactions((prev) => {
        const idx = prev.findIndex(
          (r) => r.statementId === statementId && r.userId === user.id && r.isActive && !r.deletedAt
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            viewed: true,
            reaction: nextReaction ?? undefined,
            updatedAt: new Date(),
          };
          return copy;
        }
        return [
          ...prev,
          {
            id: `optimistic-${statementId}-${user.id}`,
            statementId,
            userId: user.id,
            userName: user.name?.trim() || 'Você',
            viewed: true,
            reaction: nextReaction ?? undefined,
            isActive: true,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      });

      if (isReactionsModalOpen && reactionsModalStatementId === statementId) {
        setReactionsModalItems((prev) => {
          const idx = prev.findIndex((item) => item.userId === user.id);
          if (!nextReaction) {
            if (idx < 0) return prev;
            const copy = [...prev];
            copy.splice(idx, 1);
            return copy;
          }
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], reaction: nextReaction };
            return copy;
          }
          return [
            ...prev,
            {
              userId: user.id,
              userName: user.name?.trim() || 'Você',
              userAvatar: user.avatar || undefined,
              department: undefined,
              reaction: nextReaction,
            },
          ];
        });
      }

      setStatements((prev) =>
        prev.map((s) => (s.id === statementId ? { ...s, viewed: true } : s))
      );
      setDetailStatement((prev) =>
        prev?.id === statementId ? { ...prev, viewed: true } : prev
      );
      emitCommunicadosUnreadChanged();

      const { error } = await databaseService.upsertStatementReaction(statementId, {
        viewed: true,
        reaction: nextReaction,
      });
      if (error) {
        toast.error('Não foi possível guardar sua reação.');
        // Re-sincroniza estado com backend em caso de falha.
        await loadData();
        return;
      }

      // Persistiu com sucesso; recarrega em background para garantir consistência total.
      void loadData();
    },
    [
      isReactionsModalOpen,
      loadData,
      reactionsModalStatementId,
      user?.avatar,
      user?.id,
      user?.name,
    ]
  );

  const handleOpenReactionsModal = useCallback(async (statement: Statement) => {
    setIsReactionsModalOpen(true);
    setReactionsModalTitle(statement.title);
    setReactionsModalStatementId(statement.id);
    setReactionsModalLoading(true);
    setReactionsModalItems([]);

    const { data, error } = await databaseService.listStatementReactionsWithUsers(statement.id);
    if (error) {
      setReactionsModalLoading(false);
      toast.error('Não foi possível carregar as reações.');
      return;
    }

    const onlyWithReaction = (data ?? []).filter((r) => !!(r.reaction ?? '').trim());
    const neonMetaByEmail = await getAllCollaboratorsNeonMeta();

    const rows = onlyWithReaction.map((r: StatementReactionWithUser) => {
      const emailKey = (r.userEmail ?? '').toLowerCase().trim();
      const neon = emailKey ? neonMetaByEmail[emailKey] : undefined;
      return {
        userId: r.userId,
        userName: r.userName || 'Usuário',
        userAvatar: r.userAvatar ?? undefined,
        department: neon?.departamento || undefined,
        reaction: String(r.reaction ?? ''),
      };
    });

    setReactionsModalItems(rows);
    setReactionsModalLoading(false);
  }, []);

  const handleOpenReactionUserProfile = useCallback(async (userId: string) => {
    setReactionsProfileLoadingId(userId);
    const { data, error } = await databaseService.getUserById(userId);
    setReactionsProfileLoadingId(null);
    if (error || !data) {
      toast.error('Não foi possível carregar o perfil deste usuário.');
      return;
    }
    setReactionsProfileUserData(data);
    setReactionsProfilePopupOpen(true);
  }, []);

  const toggleCaptionExpand = (id: string) => {
    setCaptionExpanded((prev: Record<string, boolean>) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Megaphone className="w-8 h-8 shrink-0" />
            Comunicados
          </h1>
          <p className="text-muted-foreground mt-2">
            Avisos e informações importantes da empresa
          </p>
        </div>
        {canCreateStatements && (
          <Button className="shrink-0 w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar comunicado
          </Button>
        )}
      </div>

      <div className="p-1 rounded-2xl bg-white/50 dark:bg-[#0d1520]/50 border border-slate-200 dark:border-white/5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-2 p-2">
          <div className="flex-1 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar comunicados..."
              className="pl-11 h-12 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="min-w-[min(100vw-2rem,200px)] sm:min-w-[220px] h-12 justify-between border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background rounded-xl"
              >
                <div className="flex items-center min-w-0">
                  <Filter className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{filterLabel}</span>
                </div>
                <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[min(100vw-2rem,260px)] sm:min-w-[280px] max-w-[360px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
            >
              <DropdownMenuItem
                onClick={() => setTagFilter(TAG_FILTER_ALL)}
                className="focus:bg-primary/20 focus:text-primary cursor-pointer"
              >
                Todas as tags
              </DropdownMenuItem>
              {tagOptions.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Nenhuma tag nos comunicados ainda
                </div>
              ) : (
                tagOptions.map((name) => (
                  <DropdownMenuItem
                    key={name}
                    onClick={() => setTagFilter(name)}
                    className="focus:bg-primary/20 focus:text-primary cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 mr-2 shrink-0" />
                    <span className="truncate">{name}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Nenhum comunicado encontrado</h3>
            <p className="text-muted-foreground">
              {searchQuery || tagFilter !== TAG_FILTER_ALL
                ? 'Tente ajustar a busca ou o filtro de tags.'
                : 'Ainda não há comunicados. Quando um administrador publicar um aviso, ele aparecerá aqui.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-7 w-full">
          {filtered.map((s, index) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />
              <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0d1520]/80 backdrop-blur-md transition-all duration-300 shadow-lg hover:border-primary/30 hover:bg-white/90 dark:hover:bg-[#0d1520]/90 hover:shadow-primary/5 hover:-translate-y-1 text-left">
                {/* Header do Card (Estilo Instagram) */}
                <div className="flex items-center justify-between gap-2 p-3 border-b border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => void handleOpenReactionUserProfile(s.userId)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/30 -m-1 p-1"
                  >
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10">
                      <img
                        src={statementAvatarUrl(s)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.creatorName || s.userId || 'U')}`;
                        }}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold leading-none text-foreground" title={s.creatorName || 'Autor'}>
                        {s.creatorName?.trim() || 'Autor'}
                      </span>
                      <span className="mt-0.5 text-[11px] text-muted-foreground" title={formatPublishedAt(s.publishedAt)}>
                        {formatPublishedAtOneLine(s.publishedAt)}
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {!s.viewed && (
                      <span
                        className="mr-0.5 h-2 w-2 shrink-0 rounded-full bg-destructive ring-2 ring-white dark:ring-[#0d1520] shadow-sm"
                        title="Ainda não visto"
                        aria-label="Comunicado ainda não visto"
                      />
                    )}
                    {canManageStatement(s) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label="Opções do comunicado"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditStatement(s);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleArchiveStatement(s);
                            }}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Arquivar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteStatement(s);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Imagem */}
                <div className="w-full aspect-square bg-muted/20 relative cursor-pointer overflow-hidden" onClick={() => handleOpenPost(s)}>
                  {s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-12 h-12 opacity-30" />
                    </div>
                  )}
                </div>

                {/* Barra de Ações */}
                <div className="px-3 pt-3 pb-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenReactionsModal(s)}
                    className="flex items-center justify-center hover:opacity-70 transition-opacity"
                    title="Reações"
                  >
                    {(() => {
                      const summary = reactionSummaryByStatementId.get(s.id);
                      const emojis = summary?.uniqueEmojis?.slice(0, 3) ?? [];
                      const total = summary?.total ?? 0;
                      if (!total) {
                        return <SmilePlus className="w-6 h-6 text-foreground" strokeWidth={1.5} />;
                      }
                      return (
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1">
                            {emojis.map((emoji, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-background border border-background shadow-sm z-[1]"
                                style={{ zIndex: emojis.length - idx }}
                              >
                                <AnimatedEmoji emoji={emoji} className="w-4 h-4" loop={true} />
                              </span>
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{total}</span>
                        </div>
                      );
                    })()}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPost(s)}
                    className="ml-auto flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                    title="Comentar / Ver detalhes"
                  >
                    {(commentCountByStatementId.get(s.id) ?? 0) > 0 && (
                      <span className="text-sm font-semibold text-foreground">
                        {commentCountByStatementId.get(s.id)}
                      </span>
                    )}
                    <MessageCircleMore className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Área de Texto */}
                <div className="px-3 pb-4 flex flex-col flex-1 min-h-0">
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold mr-1.5 cursor-pointer hover:underline" onClick={() => handleOpenPost(s)}>
                        {s.title}
                      </span>
                      {s.caption ? (
                        <span
                          className={cn(
                            'font-light text-muted-foreground whitespace-pre-wrap',
                            !captionExpanded[s.id] && (s.caption.length > CAPTION_COLLAPSE_CHARS || s.caption.split('\n').length > 3)
                              ? 'line-clamp-2 [display:-webkit-inline-box]'
                              : ''
                          )}
                        >
                          {s.caption}
                        </span>
                      ) : null}
                    </p>
                    
                    {s.caption && (s.caption.length > CAPTION_COLLAPSE_CHARS || s.caption.split('\n').length > 3) && (
                      <button
                        type="button"
                        onClick={() => toggleCaptionExpand(s.id)}
                        className="text-xs font-medium text-primary hover:text-primary/80 hover:underline mt-1 transition-colors"
                      >
                        {captionExpanded[s.id] ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}
                  </div>

                  {s.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {s.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground"
                        >
                          <Tag className="w-3 h-3 shrink-0" />
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!detailStatement} onOpenChange={(open) => !open && setDetailStatement(null)}>
        <DialogContent className="max-w-[min(100vw-2rem,68rem)] max-h-[92vh] sm:h-[min(92vh,860px)] overflow-hidden p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl flex flex-col">
          {detailStatement ? (
            <div className="flex min-h-0 flex-1 flex-col sm:flex-row overflow-hidden">
              <div className="relative flex w-full min-w-0 items-center justify-center bg-muted/30 min-h-[200px] max-h-[42vh] sm:max-h-full sm:w-1/2 sm:flex-1 border-b sm:border-b-0 sm:border-r border-border/50 overflow-hidden">
                {detailStatement.imageUrl ? (
                  <img
                    src={detailStatement.imageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImagePlus className="w-16 h-16 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-6 py-6 space-y-4">
                <DialogHeader className="text-left space-y-3 p-0">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void handleOpenReactionUserProfile(detailStatement.userId)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/30 -m-1 p-1"
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10">
                        <img
                          src={statementAvatarUrl(detailStatement)}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              detailStatement.creatorName || detailStatement.userId || 'U'
                            )}`;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {detailStatement.creatorName?.trim() || 'Autor'}
                        </span>
                        <span className="text-[11px] text-muted-foreground" title={formatPublishedAt(detailStatement.publishedAt)}>
                          {formatPublishedAtOneLine(detailStatement.publishedAt)}
                        </span>
                      </div>
                    </button>
                    {canManageStatement(detailStatement) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            aria-label="Opções do comunicado"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditStatement(detailStatement);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              void handleArchiveStatement(detailStatement);
                            }}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Arquivar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              void handleDeleteStatement(detailStatement);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <DialogTitle className="text-2xl font-bold tracking-tight pr-2">
                    {detailStatement.title}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-sm text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => handleOpenReactionsModal(detailStatement)}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2 py-1 text-[11px] text-foreground shadow-sm backdrop-blur hover:bg-accent/80 transition-colors"
                      title="Ver reações"
                      aria-label="Ver reações do post"
                    >
                      {(() => {
                        const summary = reactionSummaryByStatementId.get(detailStatement.id);
                        const emojis = summary?.uniqueEmojis?.slice(0, 4) ?? [];
                        const total = summary?.total ?? 0;
                        if (!total) return <SmilePlus className="w-3.5 h-3.5 shrink-0" />;
                        return (
                          <>
                            <div className="flex -space-x-1">
                              {emojis.map((emoji, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-background border border-background shadow-sm z-[1]"
                                  style={{ zIndex: emojis.length - idx }}
                                >
                                  <AnimatedEmoji emoji={emoji} className="w-3 h-3" loop={true} />
                                </span>
                              ))}
                            </div>
                            <span className="font-semibold">{total}</span>
                          </>
                        );
                      })()}
                    </button>
                  </div>
                </DialogHeader>
                {detailStatement.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detailStatement.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border bg-primary/10 border-primary/25 text-primary"
                      >
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {detailStatement.caption ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Legenda</p>
                    <div className="text-sm font-light text-foreground leading-relaxed whitespace-pre-wrap space-y-2">
                      {detailStatement.caption.split('\n').map((line, i) => {
                        // Substituir emojis por ícones
                        let parsedLine = line;
                        const hasCalendar = parsedLine.includes('📅');
                        const hasClock = parsedLine.includes('⏰');
                        const hasPin = parsedLine.includes('📍');
                        
                        if (!hasCalendar && !hasClock && !hasPin) {
                          return <p key={i}>{line}</p>;
                        }
                        
                        return (
                          <p key={i} className="flex items-start gap-2">
                            {hasCalendar && <CalendarDays className="w-4 h-4 mt-0.5 shrink-0 text-primary" />}
                            {hasClock && <Clock8 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />}
                            {hasPin && <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />}
                            <span>{line.replace(/[📅⏰📍]/g, '').trim()}</span>
                          </p>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem legenda.</p>
                )}

                {/* Comentários */}
                <div className="mt-8 pt-6 border-t border-border/50 flex flex-col min-h-[300px]">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Comentários ({comments.length})
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                    {commentsLoading ? (
                      <div className="flex justify-center py-4">
                        <LoadingGif size="sm" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum comentário ainda. Seja o primeiro a comentar!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                          <img
                            src={comment.userAvatar || DEFAULT_AVATAR}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-border/50"
                          />
                          <div className="flex-1 bg-muted/30 rounded-2xl rounded-tl-none p-3 relative">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {comment.userName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                            
                            {user?.id === comment.userId && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="absolute -right-2 -top-2 p-1.5 bg-background border border-border/50 rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive hover:text-destructive-foreground"
                                title="Excluir comentário"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto pt-2 bg-background/95 backdrop-blur sticky bottom-0">
                    <img
                      src={user?.avatar || DEFAULT_AVATAR}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-border/50"
                    />
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Escreva um comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        className="pr-12 rounded-full bg-muted/50 border-border/50 focus-visible:ring-primary/30"
                        disabled={submittingComment}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || submittingComment}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-primary hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                      >
                        {submittingComment ? (
                          <LoadingGif size="sm" className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isReactionsModalOpen}
        onOpenChange={(open) => {
          setIsReactionsModalOpen(open);
          if (!open) {
            setReactionsModalItems([]);
            setReactionsModalStatementId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Reações do post</DialogTitle>
            <DialogDescription className="line-clamp-2">{reactionsModalTitle}</DialogDescription>
          </DialogHeader>
          {reactionsModalStatementId ? (
            <div className="mt-2 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sua reação
              </p>
              <StatementReactionPicker
                currentReaction={myReactionByStatementId.get(reactionsModalStatementId) ?? null}
                onReact={(emoji) => {
                  void handleReactToStatement(reactionsModalStatementId, emoji);
                }}
              />
            </div>
          ) : null}
          <div className="mt-4 min-h-[180px] max-h-[55vh] overflow-y-auto space-y-2 pr-1">
            {reactionsModalLoading ? (
              <LoadingGifScreen className="h-40" />
            ) : reactionsModalItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há reações neste comunicado.</p>
            ) : (
              reactionsModalItems.map((item) => (
                <button
                  key={`${item.userId}-${item.reaction}`}
                  type="button"
                  onClick={() => void handleOpenReactionUserProfile(item.userId)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-left',
                    'cursor-pointer transition-all duration-200 hover:border-primary/30 hover:bg-muted/35 hover:shadow-sm'
                  )}
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/30">
                    {reactionsProfileLoadingId === item.userId ? (
                      <LoadingGif size="sm" />
                    ) : (
                      <img
                        src={item.userAvatar || DEFAULT_AVATAR}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {item.userName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.department || 'Departamento não informado'}
                    </p>
                  </div>
                  <AnimatedEmoji emoji={item.reaction} className="w-6 h-6 shrink-0" loop={true} />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {canCreateStatements && (
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="sm:max-w-[520px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
            <div className="relative overflow-hidden border-b border-border/40 px-6 pt-6 pb-5 shrink-0">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-violet-500/[0.06]"
                aria-hidden
              />
              <DialogHeader className="relative text-left space-y-3">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1 pt-0.5 min-w-0">
                    <DialogTitle className="text-xl font-semibold tracking-tight">Novo comunicado</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                      Preencha os dados e publique. A imagem vai para o bucket GeComunicado e o registro para a tabela statement.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 text-sm text-destructive bg-destructive/[0.08] px-4 py-3 rounded-2xl border border-destructive/20"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="leading-snug">{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="comunicado-titulo" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Type className="w-3.5 h-3.5" />
                  </span>
                  Título
                  <span className="text-destructive font-bold">*</span>
                </label>
                <Input
                  id="comunicado-titulo"
                  placeholder="Ex.: Fechamento do escritório em feriado"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/40"
                />
              </div>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImagePlus className="w-3.5 h-3.5" />
                  </span>
                  Imagem
                  <span className="text-destructive font-bold">*</span>
                </span>
                <p className="text-xs text-muted-foreground">Armazenada no bucket público GeComunicado (Supabase).</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onImageChange}
                  aria-label="Selecionar imagem do comunicado"
                />
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 border-border/60 shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Selecionar arquivo
                  </Button>
                  {imagePreviewUrl ? (
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-2 max-w-full overflow-hidden">
                      <img
                        src={imagePreviewUrl}
                        alt="Pré-visualização"
                        className="max-h-40 w-auto max-w-full object-contain rounded-xl mx-auto"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">Nenhuma imagem selecionada.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="comunicado-legenda" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </span>
                  Legenda
                </label>
                <textarea
                  id="comunicado-legenda"
                  placeholder="Texto que acompanha o comunicado…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  className={cn(
                    'w-full min-h-[88px] resize-y rounded-2xl border border-border/60 px-3 py-2.5 text-sm font-light text-foreground shadow-sm transition-colors',
                    'placeholder:text-muted-foreground/50',
                    'bg-gradient-to-b from-background to-muted/10',
                    'dark:bg-none dark:bg-muted/40 dark:border-border/60 dark:[color-scheme:dark]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-primary/40'
                  )}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="comunicado-tags" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tags className="w-3.5 h-3.5" />
                  </span>
                  Tags
                </label>
                <p className="text-xs text-muted-foreground -mt-1">Separe por vírgula (ex.: RH, aviso, plantão).</p>
                <Input
                  id="comunicado-tags"
                  placeholder="tag1, tag2, tag3"
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/40"
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-border/50 bg-muted/10 px-6 py-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11 border-border/60"
                onClick={() => setIsCreateOpen(false)}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button className="flex-1 rounded-xl h-11 shadow-md shadow-primary/10" onClick={handleCreate} disabled={formLoading}>
                {formLoading ? <LoadingGif size="sm" className="mr-2" /> : <Plus className="w-4 h-4 mr-2 opacity-90" />}
                Criar comunicado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={!!editStatement}
        onOpenChange={(open) => {
          if (!open) setEditStatement(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <div className="relative overflow-hidden border-b border-border/40 px-6 pt-6 pb-5 shrink-0">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-violet-500/[0.06]"
              aria-hidden
            />
            <DialogHeader className="relative text-left space-y-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Pencil className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1 pt-0.5 min-w-0">
                  <DialogTitle className="text-xl font-semibold tracking-tight">Editar comunicado</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    Atualize o título, legenda, tags ou substitua a imagem.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {editFormError && (
              <div
                role="alert"
                className="flex items-start gap-3 text-sm text-destructive bg-destructive/[0.08] px-4 py-3 rounded-2xl border border-destructive/20"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-snug">{editFormError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="edit-comunicado-titulo" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Type className="w-3.5 h-3.5" />
                </span>
                Título
                <span className="text-destructive font-bold">*</span>
              </label>
              <Input
                id="edit-comunicado-titulo"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ImagePlus className="w-3.5 h-3.5" />
                </span>
                Imagem
              </label>
              <p className="text-xs text-muted-foreground -mt-1">Opcional: escolha uma nova imagem para substituir a atual.</p>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onEditImageChange}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-dashed border-border/70 px-4 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
                >
                  Escolher arquivo
                </button>
                {editImagePreview ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border/60 bg-muted/20">
                    <img src={editImagePreview} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-comunicado-legenda" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <AlignLeft className="w-3.5 h-3.5" />
                </span>
                Legenda
              </label>
              <textarea
                id="edit-comunicado-legenda"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={3}
                className={cn(
                  'w-full min-h-[88px] resize-y rounded-2xl border border-border/60 px-3 py-2.5 text-sm font-light text-foreground shadow-sm transition-colors',
                  'placeholder:text-muted-foreground/50',
                  'bg-gradient-to-b from-background to-muted/10',
                  'dark:bg-none dark:bg-muted/40 dark:border-border/60 dark:[color-scheme:dark]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-primary/40'
                )}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-comunicado-tags" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Tags className="w-3.5 h-3.5" />
                </span>
                Tags
              </label>
              <Input
                id="edit-comunicado-tags"
                placeholder="tag1, tag2, tag3"
                value={editTagsRaw}
                onChange={(e) => setEditTagsRaw(e.target.value)}
                className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/40"
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-border/50 bg-muted/10 px-6 py-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11 border-border/60"
              onClick={() => setEditStatement(null)}
              disabled={editLoading}
            >
              Cancelar
            </Button>
            <Button className="flex-1 rounded-xl h-11 shadow-md shadow-primary/10" onClick={() => void handleEditSave()} disabled={editLoading}>
              {editLoading ? <LoadingGif size="sm" className="mr-2" /> : <Pencil className="w-4 h-4 mr-2 opacity-90" />}
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProfileCardInfoPopup
        open={reactionsProfilePopupOpen}
        onOpenChange={(open) => {
          setReactionsProfilePopupOpen(open);
          if (!open) setReactionsProfileUserData(null);
        }}
        userData={reactionsProfileUserData}
        currentUser={user}
      />
    </div>
  );
}
