import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { GEAPPS_PROFILE_URL } from "@/lib/brandAssets"

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "h",
      altKey: true,
      action: () => navigate("/dashboard"),
      description: "Ir para Dashboard",
    },
    {
      key: "d",
      altKey: true,
      action: () => navigate("/dados"),
      description: "Ir para Dados",
    },
    {
      key: "l",
      altKey: true,
      action: () => navigate("/leads"),
      description: "Ir para Leads",
    },
    {
      key: "p",
      altKey: true,
      action: () => { window.location.href = GEAPPS_PROFILE_URL },
      description: "Abrir Perfil no GêApps",
    },
    {
      key: ",",
      altKey: true,
      action: () => navigate("/settings"),
      description: "Ir para Configurações",
    },
  ]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar atalhos quando estiver em inputs/textareas
      const activeElement = document.activeElement
      const isInputField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true"

      if (isInputField) return

      const eventKey = String(event.key ?? "").toLowerCase()
      const shortcut = shortcuts.find(
        (s) =>
          String(s.key ?? "").toLowerCase() === eventKey &&
          s.ctrlKey === event.ctrlKey &&
          s.shiftKey === event.shiftKey &&
          s.altKey === event.altKey &&
          (s.metaKey === undefined || s.metaKey === event.metaKey)
      )

      if (shortcut) {
        event.preventDefault()
        shortcut.action()
      }

      // Atalho para mostrar todos os atalhos (?)
      if (event.shiftKey && event.key === "?") {
        event.preventDefault()
        showShortcutsHelp()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [navigate])

  const showShortcutsHelp = () => {
    const shortcuts = `Atalhos de Teclado:
• Ctrl+K - Busca global
• Alt+H - Dashboard
• Alt+D - Dados
• Alt+L - Leads
• Alt+P - Perfil (GêApps)
• Alt+, - Configurações
• Shift+? - Mostrar atalhos`

    toast.info(shortcuts, {
      duration: 8000,
    })
  }

  return { showShortcutsHelp }
}
