import { useEffect, useState } from "react"
import { useSettingsStore } from "@/store/settingsStore"

function readPrimaryRawFromDom() {
  if (typeof document === "undefined") return "173 80% 40%"
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim()
  return v || "173 80% 40%"
}

/** Componentes HSL sem wrapper (ex.: `142 71% 45%`), alinhado a `--primary`. */
export function useChartPrimaryRaw() {
  const accentColor = useSettingsStore((s) => s.accentColor)
  const [raw, setRaw] = useState(readPrimaryRawFromDom)

  useEffect(() => {
    setRaw(readPrimaryRawFromDom())
  }, [accentColor])

  return raw
}

export function chartPrimaryHsl(raw: string) {
  return `hsl(${raw.trim() || "173 80% 40%"})`
}

export function barChartTooltipCursor(isDark: boolean, primaryRaw: string) {
  const raw = primaryRaw.trim() || "173 80% 40%"
  return isDark
    ? { fill: `hsl(${raw} / 0.34)` }
    : { fill: `hsl(${raw} / 0.14)` }
}

export function lineChartTooltipCursor(isDark: boolean, primaryRaw: string) {
  const raw = primaryRaw.trim() || "173 80% 40%"
  return isDark
    ? {
        stroke: `hsl(${raw} / 0.52)`,
        strokeWidth: 1,
        strokeDasharray: "4 4" as const,
      }
    : {
        stroke: `hsl(${raw} / 0.42)`,
        strokeWidth: 1,
        strokeDasharray: "4 4" as const,
      }
}

export function chartTooltipPanelStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
    borderRadius: "0.5rem" as const,
    boxShadow: isDark
      ? "0 10px 28px rgba(0, 0, 0, 0.5)"
      : "0 4px 14px rgba(0, 0, 0, 0.08)",
  }
}

/** Remove o painel padrão do Recharts quando o conteúdo do tooltip é customizado. */
export function chartTooltipShellStyle() {
  return {
    backgroundColor: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    boxShadow: "none",
  } as const
}
