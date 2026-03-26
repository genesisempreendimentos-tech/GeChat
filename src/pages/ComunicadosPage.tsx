import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Megaphone,
  Search,
  Filter,
  ChevronDown,
  Plus,
  CircleCheck,
  AlertCircle,
  Type,
  ImagePlus,
  AlignLeft,
  Tag,
  Tags,
  Maximize2,
  SmilePlus,
  MessageCircle,
  Send,
  Trash2,
  MessageCircleMore,
  MoreVertical,
  Pencil,
  Archive,
  BadgeCheck,
} from 'lucide-react';
import { MainViewHeader } from '@/components/layout/header';
import { MainViewFluidShell } from '@/components/layout/MainViewFluidShell';
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
import { AdminControlLine } from '@/admin/components/AdminControlLine';
import type { ViewMode } from '@/admin/components/AdminControlLine';
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
import { TRANSLUCENT_BIG_BOX } from '@/lib/translucentBigBox';
import StatementReactionPicker from '@/components/statement/StatementReactionPicker';
import { StatementTagBadge } from '@/components/statement/StatementTagBadge';
import { getAllCollaboratorsNeonMeta } from '@/services/corporateProfile';
import ProfileCardInfoPopup from '@/components/profile/ProfileCard/ProfileCardInfoPopup';
import {
  MAX_COMMENT_CONTENT_LENGTH,
  MAX_COMMENTS_PER_STATEMENT,
  MAX_STATEMENT_CAPTION_LENGTH,
  MAX_STATEMENT_TITLE_LENGTH,
  statementLimitMessages,
  validateCommentContentTrimmed,
  validateStatementCaption,
  validateStatementTitle,
} from '@/constants/statementLimits';

const TAG_FILTER_ALL = 'all';

/** Acima disto, mostramos "Ler mais" no card (legenda colapsada ~3 linhas). */
const CAPTION_COLLAPSE_CHARS = 140;
const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/initials/svg?seed=GeApps';

/** Imagem padrão já publicada no bucket GeComunicado (sem upload pelo usuário). */
const COMUNICADO_OFICIAL_IMAGE_URL =
  'https://shmrdhpjlsrqiffcykzw.supabase.co/storage/v1/object/public/GeComunicado/ComunicadoOficial01.png';
const AUTO_OPEN_COMUNICADO_ID_KEY = 'geapps:auto-open-comunicado-id';

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

  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>(TAG_FILTER_ALL);
  const [statementStatusTab, setStatementStatusTab] = useState<'published' | 'archived'>('published');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
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
  const [useOfficialComunicadoImage, setUseOfficialComunicadoImage] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
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
  const [editUseOfficialComunicadoImage, setEditUseOfficialComunicadoImage] = useState(false);
  const [editIsOfficial, setEditIsOfficial] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Statement | null>(null);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'publish' | 'delete' | null>(null);
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
    const { data } = await databaseService.listStatements(canCreateStatements);
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
  }, [canCreateStatements]);

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
      const matchStatus = statementStatusTab === 'published' ? s.isArchived !== true : s.isArchived === true;
      return matchSearch && matchTag && matchStatus;
    });
  }, [statements, searchQuery, tagFilter, statementStatusTab]);

  const resetForm = useCallback(() => {
    setTitle('');
    setCaption('');
    setTagsRaw('');
    setImageFile(null);
    setUseOfficialComunicadoImage(false);
    setIsOfficial(false);
    setFormError('');
    setImagePreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
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
      if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
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
      setEditUseOfficialComunicadoImage(false);
      setEditIsOfficial(false);
      setEditImagePreview('');
      setEditFormError('');
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }
    setEditTitle(editStatement.title);
    setEditCaption(editStatement.caption ?? '');
    setEditTagsRaw(editStatement.tags.join(', '));
    setEditImageFile(null);
    const initialImg = (editStatement.imageUrl ?? '').trim();
    setEditUseOfficialComunicadoImage(initialImg === COMUNICADO_OFICIAL_IMAGE_URL.trim());
    setEditIsOfficial(editStatement.isOfficial === true);
    setEditImagePreview(editStatement.imageUrl);
    setEditFormError('');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  }, [editStatement]);

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFormError('');
    setUseOfficialComunicadoImage(false);
    if (!f) {
      setImageFile(null);
      setImagePreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      return;
    }
    if (!f.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem (PNG, JPG, etc.).');
      e.target.value = '';
      setImageFile(null);
      setImagePreviewUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      return;
    }
    setImageFile(f);
    setImagePreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const onSelectOfficialComunicadoImage = () => {
    setFormError('');
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUseOfficialComunicadoImage(true);
    setIsOfficial(true);
    setImagePreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return COMUNICADO_OFICIAL_IMAGE_URL;
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
    const titleLimitErr = validateStatementTitle(title.trim());
    if (titleLimitErr) {
      setFormError(titleLimitErr);
      return;
    }
    if (!caption.trim()) {
      setFormError('Informe a legenda.');
      return;
    }
    const captionLimitErr = validateStatementCaption(caption);
    if (captionLimitErr) {
      setFormError(captionLimitErr);
      return;
    }
    if (!imageFile && !useOfficialComunicadoImage) {
      setFormError('Selecione um arquivo ou use a imagem Comunicado oficial.');
      return;
    }
    if (!user?.id) {
      setFormError('Sessão inválida. Faça login novamente.');
      return;
    }

    setFormLoading(true);
    let imageUrl: string;
    if (useOfficialComunicadoImage) {
      imageUrl = COMUNICADO_OFICIAL_IMAGE_URL;
    } else {
      const { url, error: upErr } = await storageService.uploadComunicadoImage(imageFile!, user.id);
      if (upErr || !url) {
        setFormLoading(false);
        const msg =
          upErr && typeof upErr === 'object' && 'message' in upErr
            ? String((upErr as { message: string }).message)
            : 'Não foi possível enviar a imagem. Verifique o bucket GeComunicado e as políticas de storage.';
        setFormError(msg);
        return;
      }
      imageUrl = url;
    }

    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const { data: created, error: dbErr } = await databaseService.createStatement({
      title: title.trim(),
      image_url: imageUrl,
      caption: caption.trim(),
      tags,
      is_oficial: isOfficial,
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
      const revertUrl = editStatement?.imageUrl ?? '';
      setEditUseOfficialComunicadoImage(
        revertUrl.trim() === COMUNICADO_OFICIAL_IMAGE_URL.trim(),
      );
      setEditImagePreview((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return revertUrl;
      });
      return;
    }
    if (!f.type.startsWith('image/')) {
      setEditFormError('Selecione um arquivo de imagem (PNG, JPG, etc.).');
      e.target.value = '';
      return;
    }
    setEditUseOfficialComunicadoImage(false);
    setEditImageFile(f);
    setEditImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const onSelectOfficialComunicadoImageEdit = () => {
    if (!editStatement) return;
    setEditFormError('');
    setEditImageFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    setEditUseOfficialComunicadoImage(true);
    setEditIsOfficial(true);
    setEditImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return COMUNICADO_OFICIAL_IMAGE_URL;
    });
  };

  const handleEditSave = async () => {
    if (!editStatement || !user?.id) return;
    setEditFormError('');
    if (!editTitle.trim()) {
      setEditFormError('Informe o título.');
      return;
    }
    const editTitleErr = validateStatementTitle(editTitle.trim());
    if (editTitleErr) {
      setEditFormError(editTitleErr);
      return;
    }
    if (!editCaption.trim()) {
      setEditFormError('Informe a legenda.');
      return;
    }
    const editCaptionErr = validateStatementCaption(editCaption);
    if (editCaptionErr) {
      setEditFormError(editCaptionErr);
      return;
    }

    setEditLoading(true);
    let imageUrl = editStatement.imageUrl;
    if (editUseOfficialComunicadoImage) {
      imageUrl = COMUNICADO_OFICIAL_IMAGE_URL;
    } else if (editImageFile) {
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
      is_oficial: editIsOfficial,
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
  const handlePublishStatement = async (s: Statement) => {
    const { error } = await databaseService.updateStatement(s.id, { is_archived: false });
    if (error) {
      toast.error(
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível publicar.'
      );
      return;
    }
    toast.success('Comunicado publicado');
    await loadData();
    emitCommunicadosUnreadChanged();
  };
  const requestArchiveStatement = useCallback((s: Statement) => {
    setConfirmTarget(s);
    setConfirmAction('archive');
  }, []);
  const requestPublishStatement = useCallback((s: Statement) => {
    setConfirmTarget(s);
    setConfirmAction('publish');
  }, []);
  const requestDeleteStatement = useCallback((s: Statement) => {
    setConfirmTarget(s);
    setConfirmAction('delete');
  }, []);

  const handleSetStatementViewed = useCallback(
    async (statement: Statement, viewed: boolean) => {
      const prevViewed = statement.viewed === true;

      // Atualização otimista da UI
      setStatements((prev) =>
        prev.map((s) => (s.id === statement.id ? { ...s, viewed } : s))
      );
      setDetailStatement((prev) =>
        prev?.id === statement.id ? { ...prev, viewed } : prev
      );
      emitCommunicadosUnreadChanged();

      const { error } = await databaseService.upsertStatementReaction(statement.id, { viewed });
      if (error) {
        // Rollback em caso de erro
        setStatements((prev) =>
          prev.map((s) => (s.id === statement.id ? { ...s, viewed: prevViewed } : s))
        );
        setDetailStatement((prev) =>
          prev?.id === statement.id ? { ...prev, viewed: prevViewed } : prev
        );
        emitCommunicadosUnreadChanged();
        toast.error('Não foi possível atualizar o status de leitura.');
        return;
      }

      toast.success(viewed ? 'Marcado como lido.' : 'Marcado como não lido.');
      void loadData();
    },
    [loadData]
  );

  const handleDeleteStatement = async (s: Statement) => {
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

    const trimmed = newComment.trim();
    const lenErr = validateCommentContentTrimmed(trimmed);
    if (lenErr) {
      toast.error(lenErr);
      return;
    }
    if (comments.length >= MAX_COMMENTS_PER_STATEMENT) {
      toast.error(statementLimitMessages.commentCountExceeded);
      return;
    }

    setSubmittingComment(true);
    const { data, error } = await databaseService.addStatementComment(detailStatement.id, newComment);
    setSubmittingComment(false);

    if (error) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: string }).message)
            : 'Erro ao adicionar comentário';
      toast.error(msg);
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

  useEffect(() => {
    if (loading || statements.length === 0) return;
    const pendingAutoOpenId = sessionStorage.getItem(AUTO_OPEN_COMUNICADO_ID_KEY);
    if (!pendingAutoOpenId) return;
    const target = statements.find((s) => s.id === pendingAutoOpenId);
    if (!target) return;
    sessionStorage.removeItem(AUTO_OPEN_COMUNICADO_ID_KEY);
    handleOpenPost(target);
  }, [loading, statements]);

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
    const { data, error } = await databaseService.getProfileForPopupByUserId(userId);
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
    <MainViewFluidShell>
    <div className="space-y-6">
      <MainViewHeader
        icon={<Megaphone className="h-6 w-6" />}
        title="Comunicados"
        description="Avisos e informações importantes da empresa."
        button={
          canCreateStatements ? (
            <Button
              className="h-10 w-full rounded-xl px-4 font-semibold shadow-sm shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/30 sm:w-auto"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar comunicado
            </Button>
          ) : undefined
        }
      />

      <AdminControlLine
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle
        leftContent={
          canCreateStatements ? (
            <div className="flex rounded-xl border border-border/60 p-1 bg-muted/30 shadow-sm transition-colors hover:border-border/80">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStatementStatusTab('published')}
                aria-pressed={statementStatusTab === 'published'}
                className={cn(
                  'h-8 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
                  statementStatusTab === 'published'
                    ? 'bg-primary text-primary-foreground shadow-md px-3'
                    : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <CircleCheck className="w-4 h-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {statementStatusTab === 'published' && (
                    <motion.span
                      initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                      animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                      exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Publicados
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStatementStatusTab('archived')}
                aria-pressed={statementStatusTab === 'archived'}
                className={cn(
                  'h-8 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
                  statementStatusTab === 'archived'
                    ? 'bg-primary text-primary-foreground shadow-md px-3'
                    : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Archive className="w-4 h-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {statementStatusTab === 'archived' && (
                    <motion.span
                      initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                      animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                      exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Arquivados
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          ) : null
        }
        centerContent={
          <div className="relative group/search w-full max-w-3xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors duration-200" />
            <Input
              placeholder="Buscar comunicados..."
              className="pl-8 h-9 rounded-xl border-border/60 bg-muted/50 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 focus-visible:bg-background placeholder:text-muted-foreground/50 text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        }
        rightContent={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 min-w-[220px] justify-between rounded-xl border-border/60 bg-muted/50 px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40"
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
              className="min-w-[280px] max-w-[360px] max-h-[280px] overflow-y-auto bg-white dark:bg-[#0d1520] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
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
        }
      />

      {loading ? (
        <LoadingGifScreen className="h-64" />
      ) : filtered.length === 0 ? (
        <Card className={cn(TRANSLUCENT_BIG_BOX, 'shadow-none')}>
          <CardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">Ops... Nada por aqui</h3>
            <p className="text-muted-foreground">
              {searchQuery || tagFilter !== TAG_FILTER_ALL
                ? 'Tente ajustar a busca ou o filtro de tags.'
                : 'Ainda não há comunicados.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="border-border/60 bg-background/40">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="text-left py-3 px-4 font-semibold">Comunicado</th>
                    <th className="text-left py-3 px-4 font-semibold">Autor</th>
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Tags</th>
                    <th className="text-right py-3 px-4 font-semibold">Comentários</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/40 hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleOpenPost(s)}
                    >
                      <td className="py-3 px-4 max-w-[420px]">
                        <div className="font-medium truncate">{s.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.caption || 'Sem legenda'}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{s.creatorName?.trim() || 'Autor'}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{formatPublishedAtOneLine(s.publishedAt)}</td>
                      <td className="py-3 px-4">
                        {s.tags.length > 0 ? (
                          <div className="flex max-w-[320px] flex-wrap gap-1.5">
                            {s.tags.map((t) => (
                              <span
                                key={`${s.id}-${t}`}
                                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                              >
                                <Tag className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[140px]">{t}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{commentCountByStatementId.get(s.id) ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    {user?.id === s.userId ? (
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
                              void handleSetStatementViewed(s, !(s.viewed === true));
                            }}
                          >
                            {s.viewed ? (
                              <>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Não lido
                              </>
                            ) : (
                              <>
                                <CircleCheck className="mr-2 h-4 w-4" />
                                Lido
                              </>
                            )}
                          </DropdownMenuItem>
                          {s.isArchived ? (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                requestPublishStatement(s);
                              }}
                            >
                              <CircleCheck className="mr-2 h-4 w-4" />
                              Repostar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                requestArchiveStatement(s);
                              }}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteStatement(s);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
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
                        return <SmilePlus className="h-5 w-5 text-foreground" strokeWidth={1.5} />;
                      }
                      return (
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1">
                            {emojis.map((emoji, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-background border border-background shadow-sm z-[1]"
                                style={{ zIndex: emojis.length - idx }}
                              >
                                <AnimatedEmoji emoji={emoji} className="w-3.5 h-3.5" loop={true} />
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
                    className="ml-auto flex items-center gap-1 hover:opacity-70 transition-opacity"
                    title="Comentários"
                  >
                    <MessageCircleMore className="h-5 w-5 shrink-0 text-foreground" strokeWidth={1.5} />
                    {(commentCountByStatementId.get(s.id) ?? 0) > 0 && (
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {commentCountByStatementId.get(s.id)}
                      </span>
                    )}
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.tags.map((t) => (
                        <StatementTagBadge key={`${s.id}-${t}`} label={t} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog
        open={!!confirmTarget && !!confirmAction}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
            setConfirmAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px] p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
          <div className="p-6 space-y-2">
            <DialogHeader className="text-left">
              <DialogTitle>
                {confirmAction === 'publish'
                  ? 'Repostar este comunicado?'
                  : confirmAction === 'delete'
                    ? 'Excluir este comunicado?'
                    : 'Arquivar este comunicado?'}
              </DialogTitle>
              <DialogDescription>
                {confirmAction === 'publish'
                  ? 'Ele voltará a aparecer na lista para todos.'
                  : confirmAction === 'delete'
                    ? 'Esta ação é permanente e não pode ser desfeita.'
                    : 'Ele deixará de aparecer na lista para todos.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border/50 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmTarget(null);
                setConfirmAction(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmAction === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (!confirmTarget || !confirmAction) return;
                const target = confirmTarget;
                const action = confirmAction;
                setConfirmTarget(null);
                setConfirmAction(null);
                if (action === 'archive') {
                  void handleArchiveStatement(target);
                } else if (action === 'publish') {
                  void handlePublishStatement(target);
                } else {
                  void handleDeleteStatement(target);
                }
              }}
            >
              {confirmAction === 'publish' ? 'Repostar' : confirmAction === 'delete' ? 'Excluir' : 'Arquivar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {/* Scroll único: post + comentários; rodapé só o input (irmão abaixo) */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 pt-6">
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
                    {/* Mesma regra dos cards da lista: só autor vê o menu (não admin em post alheio) */}
                    {user?.id === detailStatement.userId ? (
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
                              void handleSetStatementViewed(
                                detailStatement,
                                !(detailStatement.viewed === true)
                              );
                            }}
                          >
                            {detailStatement.viewed ? (
                              <>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Não lido
                              </>
                            ) : (
                              <>
                                <CircleCheck className="mr-2 h-4 w-4" />
                                Lido
                              </>
                            )}
                          </DropdownMenuItem>
                          {detailStatement.isArchived ? (
                            <DropdownMenuItem
                              onClick={() => {
                                requestPublishStatement(detailStatement);
                              }}
                            >
                              <CircleCheck className="mr-2 h-4 w-4" />
                              Repostar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => {
                                requestArchiveStatement(detailStatement);
                              }}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              requestDeleteStatement(detailStatement);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  <DialogTitle className="text-2xl font-bold tracking-tight pr-2">
                    {detailStatement.title}
                  </DialogTitle>
                </DialogHeader>
                {detailStatement.caption ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legenda</p>
                    <p className="text-sm font-light leading-relaxed text-foreground whitespace-pre-wrap">
                      {detailStatement.caption}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem legenda.</p>
                )}
                {detailStatement.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detailStatement.tags.map((t) => (
                      <StatementTagBadge key={`${detailStatement.id}-${t}`} label={t} />
                    ))}
                  </div>
                ) : null}

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/50 pb-3 pt-5">
                    <h3 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-foreground">
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        Comentários ({comments.length})
                      </span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenReactionsModal(detailStatement)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2 py-1 text-[11px] text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent/80"
                      title="Ver reações"
                      aria-label="Ver reações do post"
                    >
                      {(() => {
                        const summary = reactionSummaryByStatementId.get(detailStatement.id);
                        const emojis = summary?.uniqueEmojis?.slice(0, 4) ?? [];
                        const total = summary?.total ?? 0;
                        if (!total) return <SmilePlus className="h-3.5 w-3.5 shrink-0" />;
                        return (
                          <>
                            <div className="flex -space-x-1">
                              {emojis.map((emoji, idx) => (
                                <span
                                  key={idx}
                                  className="z-[1] inline-flex h-4 w-4 items-center justify-center rounded-full border border-background bg-background shadow-sm"
                                  style={{ zIndex: emojis.length - idx }}
                                >
                                  <AnimatedEmoji emoji={emoji} className="h-3 w-3" loop={true} />
                                </span>
                              ))}
                            </div>
                            <span className="font-semibold">{total}</span>
                          </>
                        );
                      })()}
                    </button>
                  </div>

                  <div className="min-h-0 pr-1">
                    {commentsLoading ? (
                      <div className="flex justify-center py-4">
                        <LoadingGif size="sm" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum comentário ainda. Seja o primeiro a comentar!
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="group flex gap-3">
                            <button
                              type="button"
                              onClick={() => void handleOpenReactionUserProfile(comment.userId)}
                              className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/30"
                              aria-label={`Ver perfil de ${comment.userName}`}
                            >
                              {reactionsProfileLoadingId === comment.userId ? (
                                <LoadingGif size="sm" />
                              ) : (
                                <img
                                  src={comment.userAvatar || DEFAULT_AVATAR}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </button>
                            <div className="relative flex-1 rounded-2xl rounded-tl-none bg-muted/30 p-3">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-foreground">{comment.userName}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(comment.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm text-foreground/90">{comment.content}</p>
                              {user?.id === comment.userId && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="absolute -right-2 -top-2 rounded-full border border-border/50 bg-background p-1.5 text-destructive opacity-0 shadow-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                                  title="Excluir comentário"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                <div className="h-5 shrink-0" aria-hidden />

                </div>

                  <div className="shrink-0 border-t border-border/60 bg-background px-6 py-4 dark:bg-[#0d1520]">
                    {comments.length >= MAX_COMMENTS_PER_STATEMENT ? (
                      <p className="mb-3 text-xs font-medium text-destructive" role="status">
                        {statementLimitMessages.commentCountExceeded}
                      </p>
                    ) : null}
                    <div className="flex w-full max-w-full items-center gap-3">
                      <img
                        src={user?.avatar || DEFAULT_AVATAR}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border border-border/50 object-cover"
                      />
                      <div className="relative min-w-0 flex-1">
                        <Input
                          placeholder="Escreva um comentário..."
                          value={newComment}
                          maxLength={MAX_COMMENT_CONTENT_LENGTH}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (comments.length < MAX_COMMENTS_PER_STATEMENT) handleAddComment();
                            }
                          }}
                          className="w-full rounded-full border-border/50 bg-muted/50 pr-12 focus-visible:ring-primary/30"
                          disabled={
                            submittingComment || comments.length >= MAX_COMMENTS_PER_STATEMENT
                          }
                          aria-label="Texto do comentário"
                        />
                        <button
                          type="button"
                          onClick={handleAddComment}
                          disabled={
                            !newComment.trim() ||
                            submittingComment ||
                            comments.length >= MAX_COMMENTS_PER_STATEMENT
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          {submittingComment ? (
                            <LoadingGif size="sm" className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
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
                      Crie um novo comunicado para todos os usuários do GêApps.
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
                  maxLength={MAX_STATEMENT_TITLE_LENGTH}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/40"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">
                  {title.length}/{MAX_STATEMENT_TITLE_LENGTH}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImagePlus className="w-3.5 h-3.5" />
                  </span>
                  Imagem
                  <span className="text-destructive font-bold">*</span>
                </span>
                <p className="text-xs text-muted-foreground">
                  Arquivos em PNG ou JPG. Tamanho ideal de 1350 x 1080 pixels.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onImageChange}
                  aria-label="Selecionar imagem do comunicado"
                />
                <div className="flex flex-row gap-4 items-stretch">
                  <div
                    className={cn(
                      'w-36 h-36 shrink-0 rounded-2xl border border-border/60 bg-muted/20 overflow-hidden',
                      'flex items-center justify-center',
                    )}
                  >
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Pré-visualização"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="w-10 h-10 text-muted-foreground/35" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl h-11 border-border/60 w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Selecionar arquivo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl h-11 border-border/60 w-full gap-2"
                      onClick={onSelectOfficialComunicadoImage}
                    >
                      <BadgeCheck className="w-4 h-4 shrink-0 opacity-80" />
                      Comunicado oficial
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="comunicado-legenda" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </span>
                  Legenda
                  <span className="text-destructive font-bold">*</span>
                </label>
                <textarea
                  id="comunicado-legenda"
                  placeholder="Texto que acompanha o comunicado…"
                  value={caption}
                  maxLength={MAX_STATEMENT_CAPTION_LENGTH}
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
                <p className="text-xs text-muted-foreground text-right tabular-nums">
                  {caption.length}/{MAX_STATEMENT_CAPTION_LENGTH}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BadgeCheck className="w-3.5 h-3.5" />
                  </span>
                  Comunicado oficial
                </label>
                <div className="h-12 rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/10 px-3 flex items-center justify-between shadow-sm">
                  <span className="text-sm text-muted-foreground">
                    {isOfficial ? 'Marcado como oficial' : 'Não oficial'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isOfficial}
                    onClick={() => setIsOfficial((v) => !v)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      isOfficial ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                        isOfficial ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="comunicado-tags" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tags className="w-3.5 h-3.5" />
                  </span>
                  Tags
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
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
                    Altere o título, legenda, imagem ou tags do comunicado.
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
                maxLength={MAX_STATEMENT_TITLE_LENGTH}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-12 rounded-2xl border-border/60 bg-gradient-to-b from-background to-muted/10 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary/40"
              />
              <p className="text-xs text-muted-foreground text-right tabular-nums">
                {editTitle.length}/{MAX_STATEMENT_TITLE_LENGTH}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ImagePlus className="w-3.5 h-3.5" />
                </span>
                Imagem
                <span className="text-destructive font-bold">*</span>
              </label>
              <p className="text-xs text-muted-foreground -mt-1">
                Arquivos em PNG ou JPG. Tamanho ideal de 1350 x 1080 pixels.
              </p>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onEditImageChange}
                aria-label="Selecionar nova imagem do comunicado"
              />
              <div className="flex flex-row gap-4 items-stretch">
                <div
                  className={cn(
                    'w-36 h-36 shrink-0 rounded-2xl border border-border/60 bg-muted/20 overflow-hidden',
                    'flex items-center justify-center',
                  )}
                >
                  {editImagePreview ? (
                    <img
                      src={editImagePreview}
                      alt="Pré-visualização"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="w-10 h-10 text-muted-foreground/35" aria-hidden />
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 border-border/60 w-full"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    Selecionar arquivo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl h-11 border-border/60 w-full gap-2"
                    onClick={onSelectOfficialComunicadoImageEdit}
                  >
                    <BadgeCheck className="w-4 h-4 shrink-0 opacity-80" />
                    Comunicado oficial
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-comunicado-legenda" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <AlignLeft className="w-3.5 h-3.5" />
                </span>
                Legenda
                <span className="text-destructive font-bold">*</span>
              </label>
              <textarea
                id="edit-comunicado-legenda"
                value={editCaption}
                maxLength={MAX_STATEMENT_CAPTION_LENGTH}
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
              <p className="text-xs text-muted-foreground text-right tabular-nums">
                {editCaption.length}/{MAX_STATEMENT_CAPTION_LENGTH}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BadgeCheck className="w-3.5 h-3.5" />
                </span>
                Comunicado oficial
              </label>
              <div className="h-12 rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/10 px-3 flex items-center justify-between shadow-sm">
                <span className="text-sm text-muted-foreground">
                  {editIsOfficial ? 'Marcado como oficial' : 'Não oficial'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editIsOfficial}
                  onClick={() => setEditIsOfficial((v) => !v)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    editIsOfficial ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
                      editIsOfficial ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-comunicado-tags" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Tags className="w-3.5 h-3.5" />
                </span>
                Tags
              </label>
              <p className="text-xs text-muted-foreground -mt-1">Separe por vírgula (ex.: RH, aviso, plantão).</p>
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
    </MainViewFluidShell>
  );
}
