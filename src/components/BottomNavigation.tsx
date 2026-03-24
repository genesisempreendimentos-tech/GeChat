import { useLocation, useNavigate } from "react-router-dom"
import {
  Home,
  Boxes,
  Star,
  MessageCircle,
  Users,
  Settings,
  Shield,
  LayoutDashboard,
  Headset,
} from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  roles?: string[]
  /** Mostrar apenas quando role === 'admin' */
  showWhenAdmin?: boolean
}

export function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const navItems: NavItem[] = [
    {
      icon: Home,
      label: "Início",
      path: "/dashboard",
    },
    {
      icon: Boxes,
      label: "Sistemas",
      path: "/systems",
    },
    {
      icon: Star,
      label: "Favoritos",
      path: "/favorites",
    },
    {
      icon: Headset,
      label: "Solicitações",
      path: "/solicitacoes",
    },
    // {
    //   icon: MessageCircle,
    //   label: "Chat",
    //   path: "/chat",
    // },
    {
      icon: Shield,
      label: "Admin",
      path: "/admin/home",
      showWhenAdmin: true,
    },
    {
      icon: Settings,
      label: "Config",
      path: "/settings",
    },
  ]

  const hasAdminAccess = user?.accessType === "admin"
  const isAdminPath = location.pathname.startsWith("/admin")

  /** Em < md o sidebar admin fica oculto; estes itens espelham o menu admin (incl. Solicitações). */
  const adminMobileNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Início", path: "/admin/home" },
    { icon: Boxes, label: "Apps", path: "/admin/systems" },
    { icon: Star, label: "Favoritos", path: "/favorites" },
    { icon: Headset, label: "Solicitações", path: "/admin/solicitacoes" },
    { icon: Users, label: "Membros", path: "/admin/members" },
    { icon: Settings, label: "Config", path: "/settings" },
  ]

  const filteredNavItems = isAdminPath
    ? adminMobileNavItems
    : navItems.filter((item) => {
        if (item.showWhenAdmin) return hasAdminAccess
        if (!item.roles) return true
        return item.roles.includes(user?.accessType || "")
      })

  const isNavItemActive = (path: string) => {
    if (path === "/admin/home") {
      return location.pathname === "/admin/home" || location.pathname === "/admin"
    }
    return location.pathname === path
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom Navigation"
    >
      <div
        className={cn(
          "flex h-16 items-stretch",
          isAdminPath
            ? "justify-start gap-0.5 overflow-x-auto overflow-y-hidden px-1.5 [scrollbar-width:thin]"
            : "justify-around"
        )}
      >
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = isNavItemActive(item.path)

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center h-full transition-colors shrink-0",
                isAdminPath ? "min-w-[4.25rem] max-w-[5.5rem] flex-1 px-0.5" : "flex-1 min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-full transition-colors w-full",
                  isActive && "bg-primary/10"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight line-clamp-2 max-w-full px-0.5">
                  {item.label}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
