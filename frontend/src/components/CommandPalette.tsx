import * as React from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Megaphone,
  UsersRound,
  Star,
  UserCircle,
  Settings,
  ExternalLink,
  Shield,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { databaseService } from "@/services/supabase"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const isAdminPath = location.pathname.startsWith("/admin")
  const [systems, setSystems] = React.useState<{ id: string; name: string; description?: string; category?: string; url: string }[]>([])

  React.useEffect(() => {
    if (!user?.id) return
    databaseService.getSystemsForMember(user.id).then(({ data }) => {
      setSystems(data ?? [])
    })
  }, [user?.id])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      {/* Header: logo + indicador + marca (espaço à direita reservado para o botão X) */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/40 dark:bg-muted/20 px-4 py-3 pr-14 min-h-[52px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
          <img
            src="/assets/brand-mock.svg"
            alt=""
            className="h-4 w-4 dark:opacity-95"
            style={{
              filter: "brightness(0) saturate(100%) invert(55%) sepia(89%) saturate(2148%) hue-rotate(138deg) brightness(91%) contrast(96%)",
            }}
          />
        </div>
        <span
          className="h-2 w-2 shrink-0 rounded-full border-0 bg-primary"
          aria-hidden
        />
        <span className="min-w-0 flex-shrink-0 font-semibold text-foreground text-sm tracking-tight whitespace-nowrap">
          GeNovo
        </span>
        {/* Espaço reservado para o botão fechar */}
        <div className="w-12 shrink-0" aria-hidden />
      </div>
      <CommandInput placeholder="Buscar p?ginas e a??es..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem
            onSelect={() => runCommand(() => navigate(isAdminPath ? "/admin/home" : "/dashboard"))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>{isAdminPath ? "Dashboard (admin)" : "Dashboard"}</span>
          </CommandItem>
          {!isAdminPath && (
            <>
          <CommandItem onSelect={() => runCommand(() => navigate("/comunicados"))}>
            <Megaphone className="mr-2 h-4 w-4" />
            <span>Comunicados</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/equipes"))}>
            <UsersRound className="mr-2 h-4 w-4" />
            <span>Equipes</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/systems"))}>
            <Star className="mr-2 h-4 w-4" />
            <span>Item 1</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/solicitacoes"))}>
            <Star className="mr-2 h-4 w-4" />
            <span>Item 2</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/empresa"))}>
            <Star className="mr-2 h-4 w-4" />
            <span>Item 3</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/favorites"))}
          >
            <Star className="mr-2 h-4 w-4" />
            <span>Item 4</span>
          </CommandItem>
          {!isAdminPath && user?.accessType === "admin" ? (
            <CommandItem onSelect={() => runCommand(() => navigate("/admin/home"))}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Painel Admin</span>
            </CommandItem>
          ) : null}
            </>
          )}
          <CommandItem onSelect={() => runCommand(() => navigate("/profile"))}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Apps">
          {systems.map((system) => (
            <CommandItem
              key={system.id}
              onSelect={() => {
                runCommand(() => {
                  window.open(system.url, "_blank")
                })
              }}
              value={`${system.name} ${system.description} ${system.category}`}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{system.name}</span>
                <span className="text-xs text-muted-foreground">
                  {system.category}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
