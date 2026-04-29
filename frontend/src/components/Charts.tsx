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
import {
  barChartTooltipCursor,
  chartPrimaryHsl,
  lineChartTooltipCursor,
  useChartPrimaryRaw,
} from "@/lib/chartTheme"

function useDarkChartTheme() {
  const { theme } = useThemeStore()
  return theme === "dark" || theme === "full-dark"
}

function tooltipPanelStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? "#1f2937" : "#ffffff",
    border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
    borderRadius: "0.5rem" as const,
    boxShadow: isDark
      ? "0 10px 28px rgba(0, 0, 0, 0.5)"
      : "0 4px 14px rgba(0, 0, 0, 0.08)",
  }
}

interface ActivityData {
  date: string
  acessos: number
}

interface SystemUsageData {
  name: string
  acessos: number
}

export function ActivityChart({ data }: { data: ActivityData[] }) {
  const isDark = useDarkChartTheme()
  const primaryRaw = useChartPrimaryRaw()
  const primaryColor = chartPrimaryHsl(primaryRaw)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>Atividade dos Últimos 7 Dias</CardTitle>
        <CardDescription>Seus acessos diários aos aplicativos (últimos 7 dias)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={300}
          className="[&_.recharts-surface]:outline-none"
        >
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
              cursor={lineChartTooltipCursor(isDark, primaryRaw)}
              contentStyle={tooltipPanelStyle(isDark)}
              labelStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
              itemStyle={{ color: isDark ? "#f3f4f6" : "#111827" }}
            />
            <Line
              type="monotone"
              dataKey="acessos"
              stroke={primaryColor}
              strokeWidth={2}
              dot={{ fill: primaryColor, r: 4 }}
              activeDot={{
                r: 6,
                fill: primaryColor,
                stroke: `hsl(${primaryRaw} / ${isDark ? 0.55 : 0.45})`,
                strokeWidth: 2,
              }}
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
  const isDark = useDarkChartTheme()
  const primaryRaw = useChartPrimaryRaw()
  const primaryColor = chartPrimaryHsl(primaryRaw)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>Módulos mais acessados</CardTitle>
        <CardDescription>Top 5 módulos que você mais abriu nesta semana</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={300}
          className="[&_.recharts-surface]:outline-none"
        >
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
              cursor={barChartTooltipCursor(isDark, primaryRaw)}
              contentStyle={tooltipPanelStyle(isDark)}
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
              activeBar={
                isDark
                  ? { fill: "hsl(var(--chart-bar-active))" }
                  : { fill: primaryColor, opacity: 0.88 }
              }
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
  const isDark = useDarkChartTheme()
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
        <ResponsiveContainer
          width="100%"
          height={260}
          className="[&_.recharts-surface]:outline-none"
        >
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
              cursor={false}
              formatter={(value) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0);
                return [Number.isFinite(numeric) ? numeric : 0, 'Valor'];
              }}
              contentStyle={tooltipPanelStyle(isDark)}
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
