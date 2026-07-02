import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { useGeChatStore } from '@/store/gechatStore';
import type { Conversation, GroupMemberSettings, MemberRole, UserProfile } from '@/modules/gechat/types';
import { PresenceBadge } from './PresenceBadge';
import { SelectGroupMembersDialog } from './conversation-create/SelectGroupMembersDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_DESCRIPTION = 500;

interface GroupInfoViewProps {
  conversation: Conversation;
  onClose: () => void;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SettingToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
  id,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/50 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-medium">
          {title}
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked ? 'bg-primary' : 'bg-muted',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

function MemberCard({
  member,
  role,
  showAdminActions,
  acting,
  expelLabel = 'grupo',
  onMakeAdmin,
  onRemoveAdmin,
  onExpel,
}: {
  member: UserProfile;
  role?: MemberRole;
  showAdminActions?: boolean;
  acting?: boolean;
  expelLabel?: string;
  onMakeAdmin?: () => void;
  onRemoveAdmin?: () => void;
  onExpel?: () => void;
}) {
  const online = useGeChatStore((s) => s.onlineUsers[member.id]);

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/70 px-3 py-3">
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={member.avatar} alt="" />
          <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            online ? 'bg-emerald-500' : 'bg-muted-foreground/35',
          )}
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{member.name}</p>
          {role === 'admin' && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              Admin
            </Badge>
          )}
        </div>
        {member.email && (
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        )}
        <div className="mt-1">
          <PresenceBadge userId={member.id} />
        </div>
      </div>
      {showAdminActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={acting}
              aria-label={`Gerenciar ${member.name}`}
            >
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {role === 'admin' ? (
              <DropdownMenuItem onClick={onRemoveAdmin}>
                <UserMinus className="mr-2 h-4 w-4" />
                Remover como administrador
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onMakeAdmin}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Tornar administrador
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onExpel}
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="mr-2 h-4 w-4" />
              Expulsar do {expelLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

export function GroupInfoView({ conversation, onClose }: GroupInfoViewProps) {
  const upsertConversation = useGeChatStore((s) => s.upsertConversation);
  const setMembers = useGeChatStore((s) => s.setMembers);
  const setMyGroupRole = useGeChatStore((s) => s.setMyGroupRole);
  const setPresence = useGeChatStore((s) => s.setPresence);
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);
  const cachedMembers = useGeChatStore((s) => s.membersByConversation[conversation.id] ?? []);

  const [refreshing, setRefreshing] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingPermission, setSavingPermission] = useState(false);
  const [savingMemberSetting, setSavingMemberSetting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actingOnMemberId, setActingOnMemberId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);

  const [description, setDescription] = useState(conversation.description ?? '');
  const [draftDescription, setDraftDescription] = useState(conversation.description ?? '');
  const [onlyAdminsCanEdit, setOnlyAdminsCanEdit] = useState(
    Boolean(conversation.onlyAdminsCanEdit),
  );
  const [onlyAdminsCanSend, setOnlyAdminsCanSend] = useState(
    Boolean(conversation.onlyAdminsCanSend),
  );
  const [mySettings, setMySettings] = useState<GroupMemberSettings | null>(null);
  const [memberRoles, setMemberRoles] = useState<Record<string, MemberRole>>({});
  const [members, setLocalMembers] = useState<UserProfile[]>(cachedMembers);

  const isChannel = conversation.type === 'channel';
  const entityLabel = isChannel ? 'Canal' : 'Grupo';
  const entityLabelLower = isChannel ? 'canal' : 'grupo';

  const isAdmin = mySettings?.role === 'admin';
  const canEditDetails = onlyAdminsCanEdit ? Boolean(isAdmin) : true;

  const title = conversation.displayName ?? conversation.name ?? entityLabel;
  const avatarSrc = conversation.avatar;

  const applyGroupPayload = useCallback(
    (data: Awaited<ReturnType<typeof gechatApi.getGroupSettings>>) => {
      setDescription(data.conversation.description ?? '');
      setDraftDescription(data.conversation.description ?? '');
      setOnlyAdminsCanEdit(Boolean(data.conversation.onlyAdminsCanEdit));
      setOnlyAdminsCanSend(Boolean(data.conversation.onlyAdminsCanSend));
      setMySettings(data.mySettings);
      setMyGroupRole(conversation.id, data.mySettings.role);

      const roles: Record<string, MemberRole> = {};
      const profiles: UserProfile[] = [];
      for (const m of data.members) {
        roles[m.userId] = m.role;
        if (m.profile) profiles.push(m.profile);
      }
      setMemberRoles(roles);
      if (profiles.length > 0) {
        setLocalMembers(profiles);
        setMembers(conversation.id, profiles);
      }

      upsertConversation({
        ...conversation,
        name: data.conversation.name ?? conversation.name,
        description: data.conversation.description,
        avatar: data.conversation.avatar,
        onlyAdminsCanEdit: data.conversation.onlyAdminsCanEdit,
        onlyAdminsCanSend: data.conversation.onlyAdminsCanSend,
        displayName: data.conversation.name ?? conversation.displayName,
      });
    },
    [conversation, setMembers, setMyGroupRole, upsertConversation],
  );

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await gechatApi.getGroupSettings(conversation.id);
      applyGroupPayload(data);

      const memberIds = data.members.map((m) => m.userId).filter((id) => id !== currentUserId);
      if (memberIds.length > 0) {
        gechatApi.getPresence(memberIds).then((presence) => {
          for (const [id, state] of Object.entries(presence)) {
            setPresence(id, state);
          }
        }).catch(() => undefined);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Não foi possível atualizar as informações do ${entityLabelLower}.`);
    } finally {
      setRefreshing(false);
    }
  }, [applyGroupPayload, conversation.id, currentUserId, setPresence]);

  useEffect(() => {
    if (cachedMembers.length > 0) {
      setLocalMembers(cachedMembers);
    }
  }, [conversation.id, cachedMembers]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      const roleA = memberRoles[a.id] === 'admin' ? 0 : 1;
      const roleB = memberRoles[b.id] === 'admin' ? 0 : 1;
      if (roleA !== roleB) return roleA - roleB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [members, memberRoles, currentUserId]);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  const handleSaveDescription = async () => {
    if (!canEditDetails) return;
    setSavingDescription(true);
    try {
      const { conversation: updated } = await gechatApi.updateGroup(conversation.id, {
        description: draftDescription.trim(),
      });
      setDescription(updated.description ?? '');
      setDraftDescription(updated.description ?? '');
      setEditingDescription(false);
      upsertConversation({
        ...conversation,
        description: updated.description,
        displayName: updated.name ?? conversation.displayName,
      });
      toast.success('Descrição atualizada.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível salvar a descrição.');
    } finally {
      setSavingDescription(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!mySettings) return;
    setSavingMemberSetting(true);
    try {
      const { mySettings: updated } = await gechatApi.updateMemberSettings(conversation.id, {
        notificationsEnabled: enabled,
      });
      setMySettings(updated);
      toast.success(enabled ? 'Notificações ativadas.' : 'Notificações desativadas.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível atualizar as notificações.');
    } finally {
      setSavingMemberSetting(false);
    }
  };

  const handleToggleMute = async (muted: boolean) => {
    if (!mySettings) return;
    setSavingMemberSetting(true);
    try {
      const { mySettings: updated } = await gechatApi.updateMemberSettings(conversation.id, {
        muted,
      });
      setMySettings(updated);
      toast.success(muted ? `${entityLabel} silenciado.` : `${entityLabel} reativado.`);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível atualizar o silêncio.');
    } finally {
      setSavingMemberSetting(false);
    }
  };

  const handleToggleOnlyAdminsCanEdit = async (enabled: boolean) => {
    if (!isAdmin) return;
    setSavingPermission(true);
    try {
      const { conversation: updated } = await gechatApi.updateGroup(conversation.id, {
        onlyAdminsCanEdit: enabled,
      });
      setOnlyAdminsCanEdit(Boolean(updated.onlyAdminsCanEdit));
      upsertConversation({
        ...conversation,
        onlyAdminsCanEdit: updated.onlyAdminsCanEdit,
      });
      toast.success('Permissão atualizada.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível atualizar a permissão.');
    } finally {
      setSavingPermission(false);
    }
  };

  const handleToggleOnlyAdminsCanSend = async (enabled: boolean) => {
    if (!isAdmin) return;
    setSavingPermission(true);
    try {
      const { conversation: updated } = await gechatApi.updateGroup(conversation.id, {
        onlyAdminsCanSend: enabled,
      });
      setOnlyAdminsCanSend(Boolean(updated.onlyAdminsCanSend));
      upsertConversation({
        ...conversation,
        onlyAdminsCanSend: updated.onlyAdminsCanSend,
      });
      toast.success('Permissão atualizada.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível atualizar a permissão.');
    } finally {
      setSavingPermission(false);
    }
  };

  const handleInviteMembers = async (selectedIds: string[]) => {
    const newIds = selectedIds.filter((id) => !memberIds.includes(id));
    if (!newIds.length) return;
    setInviting(true);
    try {
      const { members: updatedMembers } = await gechatApi.addGroupMembers(conversation.id, newIds);
      const roles: Record<string, MemberRole> = { ...memberRoles };
      const profiles: UserProfile[] = [];
      for (const m of updatedMembers) {
        roles[m.userId] = m.role as MemberRole;
        if (m.profile) profiles.push(m.profile);
      }
      setMemberRoles(roles);
      setLocalMembers(profiles);
      setMembers(conversation.id, profiles);
      toast.success(
        `${newIds.length} membro${newIds.length !== 1 ? 's' : ''} adicionado${newIds.length !== 1 ? 's' : ''}.`,
      );
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível adicionar membros.');
    } finally {
      setInviting(false);
    }
  };

  const handleMakeAdmin = async (userId: string, memberName: string) => {
    setActingOnMemberId(userId);
    try {
      const { member } = await gechatApi.updateGroupMemberRole(conversation.id, userId, 'admin');
      setMemberRoles((prev) => ({ ...prev, [member.userId]: member.role }));
      toast.success(`${memberName} agora é administrador.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Não foi possível promover o membro.');
    } finally {
      setActingOnMemberId(null);
    }
  };

  const handleRemoveAdmin = async (userId: string, memberName: string) => {
    setActingOnMemberId(userId);
    try {
      const { member } = await gechatApi.updateGroupMemberRole(conversation.id, userId, 'member');
      setMemberRoles((prev) => ({ ...prev, [member.userId]: member.role }));
      toast.success(`${memberName} não é mais administrador.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Não foi possível alterar o papel do membro.');
    } finally {
      setActingOnMemberId(null);
    }
  };

  const handleExpelMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Expulsar ${memberName} do ${entityLabelLower}?`)) return;
    setActingOnMemberId(userId);
    try {
      await gechatApi.removeGroupMember(conversation.id, userId);
      setMemberRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setLocalMembers((prev) => {
        const next = prev.filter((m) => m.id !== userId);
        setMembers(conversation.id, next);
        return next;
      });
      toast.success(`${memberName} foi removido do ${entityLabelLower}.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Não foi possível expulsar o membro.');
    } finally {
      setActingOnMemberId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2.5 md:px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao chat
        </Button>
        {refreshing && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Atualizando
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
          <section className="relative border-b border-border/50 bg-gradient-to-b from-sky-500/[0.12] via-muted/25 to-background px-4 pb-10 pt-8 md:px-8 md:pt-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400/10 via-transparent to-transparent" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <Avatar className="h-28 w-28 shadow-lg ring-4 ring-background md:h-32 md:w-32">
                <AvatarImage src={avatarSrc} alt="" className="object-cover" />
                <AvatarFallback className="text-2xl font-semibold md:text-3xl">
                  {initials(title)}
                </AvatarFallback>
              </Avatar>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isChannel
                  ? `Canal · ${conversation.channelSubtype ?? 'geral'}`
                  : entityLabel}
                {sortedMembers.length > 0 && ` · ${sortedMembers.length} membros`}
              </p>
              {isAdmin && (
                <Badge variant="outline" className="mt-3 text-[11px] font-medium">
                  Você é administrador
                </Badge>
              )}
            </div>
          </section>

          <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 md:px-8">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Descrição
                </h2>
                {canEditDetails && !editingDescription && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      setDraftDescription(description);
                      setEditingDescription(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
              </div>

              {editingDescription ? (
                <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/15 p-4">
                  <textarea
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                    rows={4}
                    className={cn(
                      'flex w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm',
                      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    )}
                    placeholder={`Descreva o propósito deste ${entityLabelLower}...`}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {draftDescription.length}/{MAX_DESCRIPTION}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDraftDescription(description);
                          setEditingDescription(false);
                        }}
                        disabled={savingDescription}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        onClick={handleSaveDescription}
                        disabled={savingDescription}
                      >
                        {savingDescription ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-muted/15 px-4 py-4 md:px-5 md:py-5">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {description.trim() || `Este ${entityLabelLower} ainda não tem descrição.`}
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Suas preferências
              </h2>
              <div className="space-y-2">
                <SettingToggleRow
                  id="group-notifications"
                  title="Notificações"
                  description={`Receber alertas de novas mensagens neste ${entityLabelLower}.`}
                  checked={Boolean(mySettings?.notificationsEnabled)}
                  disabled={savingMemberSetting || Boolean(mySettings?.muted)}
                  onChange={handleToggleNotifications}
                />
                <SettingToggleRow
                  id="group-muted"
                  title={`Silenciar ${entityLabelLower}`}
                  description={`Parar notificações sem sair do ${entityLabelLower}.`}
                  checked={Boolean(mySettings?.muted)}
                  disabled={savingMemberSetting}
                  onChange={handleToggleMute}
                />
              </div>
            </section>

            {isAdmin && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Permissões do {entityLabelLower}
                </h2>
                <div className="space-y-2">
                  <SettingToggleRow
                    id="group-only-admins-edit"
                    title="Somente admins editam informações"
                    description="Quando ativo, apenas administradores podem alterar nome e descrição."
                    checked={onlyAdminsCanEdit}
                    disabled={savingPermission}
                    onChange={handleToggleOnlyAdminsCanEdit}
                  />
                  <SettingToggleRow
                    id="group-only-admins-send"
                    title="Somente admins enviam mensagens"
                    description={`Quando ativo, membros comuns podem ler o ${entityLabelLower}, mas não publicar.`}
                    checked={onlyAdminsCanSend}
                    disabled={savingPermission}
                    onChange={handleToggleOnlyAdminsCanSend}
                  />
                  <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Convidar membros</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Adicione colegas que ainda não fazem parte do {entityLabelLower}.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5"
                        onClick={() => setInviteOpen(true)}
                        disabled={inviting}
                      >
                        <UserPlus className="h-4 w-4" />
                        Convidar
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Membros
                </h2>
                {sortedMembers.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {sortedMembers.length}
                  </Badge>
                )}
              </div>

              {sortedMembers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                  {refreshing ? 'Carregando membros...' : 'Nenhum membro encontrado.'}
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {sortedMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      role={memberRoles[member.id]}
                      showAdminActions={isAdmin && member.id !== currentUserId}
                      acting={actingOnMemberId === member.id}
                      expelLabel={entityLabelLower}
                      onMakeAdmin={() => void handleMakeAdmin(member.id, member.name)}
                      onRemoveAdmin={() => void handleRemoveAdmin(member.id, member.name)}
                      onExpel={() => void handleExpelMember(member.id, member.name)}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

      <SelectGroupMembersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        selectedIds={[]}
        excludeIds={memberIds}
        title={`Convidar para o ${entityLabelLower}`}
        description={`Selecione os colegas que deseja adicionar ao ${entityLabelLower}.`}
        confirmLabel="Adicionar"
        onConfirm={handleInviteMembers}
      />
    </div>
  );
}
