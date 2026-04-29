import { ReactNode } from "react"
import {
  Inbox,
  Search,
  Star,
  Boxes,
  Users,
  AlertCircle,
  FileQuestion,
  Settings
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full bg-muted p-6 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function EmptySystemsState({ onAddSystem }: { onAddSystem?: () => void }) {
  return (
    <EmptyState
      icon={<Boxes className="h-12 w-12 text-muted-foreground" />}
      title="Nenhum sistema encontrado"
      description="Você ainda não tem aplicativos cadastrados. Adicione seu primeiro sistema para começar."
      action={
        onAddSystem
          ? {
              label: "Adicionar Sistema",
              onClick: onAddSystem,
            }
          : undefined
      }
    />
  )
}

export function EmptyFavoritesState({ onBrowseSystems }: { onBrowseSystems?: () => void }) {
  return (
    <EmptyState
      icon={<Star className="h-12 w-12 text-muted-foreground" />}
      title="Nenhum favorito ainda"
      description="Marque seus aplicativos favoritos para acessá-los rapidamente daqui."
      action={
        onBrowseSystems
          ? {
              label: "Explorar aplicativos",
              onClick: onBrowseSystems,
            }
          : undefined
      }
    />
  )
}

export function EmptySearchState({ searchTerm }: { searchTerm?: string }) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-muted-foreground" />}
      title="Nenhum resultado encontrado"
      description={
        searchTerm
          ? `Não encontramos resultados para "${searchTerm}". Tente buscar com outros termos.`
          : "Não encontramos resultados. Tente buscar com outros termos."
      }
    />
  )
}

export function EmptyUsersState({ onAddUser }: { onAddUser?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12 text-muted-foreground" />}
      title="Nenhum usuário cadastrado"
      description="Comece adicionando usuários para gerenciar o acesso aos aplicativos."
      action={
        onAddUser
          ? {
              label: "Adicionar Usuário",
              onClick: onAddUser,
            }
          : undefined
      }
    />
  )
}

export function ErrorState({ title, description, onRetry }: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-destructive" />}
      title={title || "Algo deu errado"}
      description={description || "Ocorreu um erro ao carregar os dados. Tente novamente."}
      action={
        onRetry
          ? {
              label: "Tentar Novamente",
              onClick: onRetry,
            }
          : undefined
      }
    />
  )
}

export function NotFoundState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <EmptyState
      icon={<FileQuestion className="h-12 w-12 text-muted-foreground" />}
      title="Página não encontrada"
      description="A página que você está procurando não existe ou foi movida."
      action={
        onGoBack
          ? {
              label: "Voltar",
              onClick: onGoBack,
            }
          : undefined
      }
    />
  )
}

export function EmptyInboxState() {
  return (
    <EmptyState
      icon={<Inbox className="h-12 w-12 text-muted-foreground" />}
      title="Nenhuma notificação"
      description="Você está em dia! Não há notificações pendentes no momento."
    />
  )
}

export function NoAccessState() {
  return (
    <EmptyState
      icon={<Settings className="h-12 w-12 text-muted-foreground" />}
      title="Acesso negado"
      description="Você não tem permissão para acessar esta página. Entre em contato com um administrador."
    />
  )
}
