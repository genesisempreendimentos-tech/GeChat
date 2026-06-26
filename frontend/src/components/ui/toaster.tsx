import { Toaster as Sonner } from "sonner"
import { useThemeStore } from "@/store/themeStore"

export function Toaster() {
  const { theme } = useThemeStore()

  return (
    <Sonner
      theme={(theme === 'full-dark' ? 'dark' : theme) as "light" | "dark" | "system"}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  )
}
