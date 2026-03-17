import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useThemeStore } from "@/store/themeStore"

interface ActivityData {
  date: string
  acessos: number
}

interface SystemUsageData {
  name: string
  acessos: number
}

function usePrimaryColor() {
  const [color, setColor] = useState("#14b8a6")
  useEffect(() => {
    const hsl = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    if (hsl) setColor(`hsl(${hsl})`)
  }, [])
  return color
}

export function ActivityChart({ data }: { data: ActivityData[] }) {
  const { theme } = useThemeStore()
  const isDark = theme === "dark"
  const primaryColor = usePrimaryColor()

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>Atividade dos Últimos 7 Dias</CardTitle>
        <CardDescription>
          Número de acessos aos sistemas por dia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              dataKey="date"
              stroke={isDark ? "#9ca3af" : "#6b7280"}
              fontSize={12}
            />
            <YAxis stroke={isDark ? "#9ca3af" : "#6b7280"} fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1f2937" : "#ffffff",
                border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
              itemStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
            />
            <Line
              type="monotone"
              dataKey="acessos"
              stroke={primaryColor}
              strokeWidth={2}
              dot={{ fill: primaryColor, r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={1500}
              animationEasing="ease-in-out"
              label={{ fill: isDark ? "#f3f4f6" : "#111827", position: 'top', dy: -10 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function SystemUsageChart({ data }: { data: SystemUsageData[] }) {
  const { theme } = useThemeStore()
  const isDark = theme === "dark"
  const primaryColor = usePrimaryColor()

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>Sistemas Mais Acessados</CardTitle>
        <CardDescription>
          Top 5 sistemas com mais acessos esta semana
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              type="number"
              stroke={isDark ? "#9ca3af" : "#6b7280"}
              fontSize={12}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke={isDark ? "#9ca3af" : "#6b7280"}
              fontSize={12}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1f2937" : "#ffffff",
                border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
              itemStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
            />
            <Bar
              dataKey="acessos"
              fill={primaryColor}
              radius={[0, 4, 4, 0]}
              animationDuration={1500}
              animationEasing="ease-out"
              label={{ fill: isDark ? "#f3f4f6" : "#111827", position: 'right' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export interface DonutSlice {
  name: string
  value: number
  color?: string
}

export function DonutChart({
  data,
  title,
  description,
}: {
  data: DonutSlice[]
  title: string
  description?: string
}) {
  const { theme } = useThemeStore()
  const isDark = theme === "dark"
  const primaryColor = "hsl(var(--primary))"
  const mutedColor = isDark ? "#6b7280" : "#9ca3af"
  const colors = data.map((d, i) => d.color ?? (i === 0 ? primaryColor : mutedColor))

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => [value ?? 0, undefined]}
              contentStyle={{
                backgroundColor: isDark ? "#1f2937" : "#ffffff",
                border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
              itemStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
