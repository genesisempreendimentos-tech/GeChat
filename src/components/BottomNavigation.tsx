import { useLocation, useNavigate } from "react-router-dom"
import { Home, Boxes, Star, MessageCircle, Users, Settings } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"

interface NavItem {
  icon: React.ElementType
  label: string
  path: string
  roles?: string[]
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
      icon: MessageCircle,
      label: "Chat",
      path: "/chat",
    },
    {
      icon: Users,
      label: "Usuários",
      path: "/users",
      roles: ["admin", "manager"],
    },
    {
      icon: Settings,
      label: "Config",
      path: "/settings",
    },
  ]

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(user?.role || "")
  })

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full transition-colors min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-full transition-colors",
                  isActive && "bg-primary/10"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-xs font-medium truncate max-w-[72px]">{item.label}</span>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
