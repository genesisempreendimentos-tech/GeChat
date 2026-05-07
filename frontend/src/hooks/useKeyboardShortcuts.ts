import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

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
      key: "s",
      altKey: true,
      action: () => navigate("/systems"),
      description: "Ir para Item 1",
    },
    {
      key: "f",
      altKey: true,
      action: () => navigate("/favorites"),
      description: "Ir para Item 4",
    },
    {
      key: "c",
      altKey: true,
      action: () => navigate("/chat"),
      description: "Ir para Chat",
    },
    {
      key: "u",
      altKey: true,
      action: () => navigate("/admin/members"),
      description: "Ir para Membros (painel admin)",
    },
    {
      key: "p",
      altKey: true,
      action: () => navigate("/profile"),
      description: "Ir para Perfil",
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
• Alt+S - Item 1
• Alt+F - Item 4
• Alt+C - Chat
• Alt+U - Usuários
• Alt+P - Perfil
• Alt+, - Configurações
• Shift+? - Mostrar atalhos`

    toast.info(shortcuts, {
      duration: 8000,
    })
  }

  return { showShortcutsHelp }
}
