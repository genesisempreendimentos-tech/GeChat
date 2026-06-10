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

function renderDonutSliceLabel(colors: string[]) {
  return (props: {
    name?: string
    percent?: number
    x?: number
    y?: number
    cx?: number
    index?: number
  }) => {
    const { name, percent, x = 0, y = 0, cx = 0, index = 0 } = props
    if (!name) return null
    const color = colors[index] ?? '#94a3b8'

    return (
      <text
        x={x}
        y={y}
        fill={color}
        textAnchor={x >= cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
        fontWeight={500}
      >
        {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
      </text>
    )
  }
}

function renderDonutSliceLabelLine(colors: string[]) {
  return (props: { points?: { x: number; y: number }[]; index?: number }) => {
    const { points, index = 0 } = props
    const color = colors[index] ?? '#94a3b8'
    const pointStr = points?.length ? points.map((p) => `${p.x},${p.y}`).join(' ') : '0,0 0,0'

    return (
      <polyline
        stroke={color}
        strokeWidth={1}
        fill="none"
        points={pointStr}
      />
    )
  }
}

function DonutSliceLegend({ data, colors }: { data: DonutSlice[]; colors: string[] }) {
  const total = data.reduce((acc, slice) => acc + slice.value, 0)

  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 border-t border-border/40 pt-3">
      {data.map((slice, index) => {
        const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0
        const color = slice.color ?? colors[index] ?? '#94a3b8'

        return (
          <li
            key={slice.name}
            className="flex items-center gap-1.5 text-[10px] leading-3 text-muted-foreground"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-border/40"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="tabular-nums">
              {slice.name} · {pct}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function DonutTooltip({
  active,
  payload,
  isDark,
  total,
}: DonutTooltipProps) {
  if (!active || !payload?.length) return null

  const entry = payload[0]
  const slice = entry.payload
  if (!slice) return null

  const value = Number(entry.value ?? slice.value ?? 0)
  const color = slice.color ?? entry.color ?? '#94a3b8'
  const pct = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={tooltipPanelStyle(isDark)}
    >
      <p className="font-semibold" style={{ color }}>
        {slice.name}
      </p>
      <p style={{ color: isDark ? '#f3f4f6' : '#111827' }}>
        {value.toLocaleString('pt-BR')} · {pct}%
      </p>
    </div>
  )
}

type DonutTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: DonutSlice; value?: number; color?: string }>
  isDark: boolean
  total: number
}

const DONUT_CHART_SIZES = {
  default: {
    height: 300,
    innerRadius: 48,
    outerRadius: 68,
    margin: { top: 28, right: 36, bottom: 12, left: 36 },
  },
  lg: {
    height: 360,
    innerRadius: 58,
    outerRadius: 92,
    margin: { top: 32, right: 44, bottom: 16, left: 44 },
  },
} as const;

export function DonutChart({
  data,
  title,
  description,
  size = 'default',
}: {
  data: DonutSlice[]
  title: string
  description?: string
  size?: keyof typeof DONUT_CHART_SIZES
}) {
  const isDark = useDarkChartTheme()
  const primaryColor = "hsl(var(--primary))"
  const mutedColor = isDark ? "#6b7280" : "#9ca3af"
  const palette = ["#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#64748b", "#22c55e", "#0ea5e9"]
  const colors = data.map((d, i) => d.color ?? palette[i % palette.length] ?? (i === 0 ? primaryColor : mutedColor))
  const total = data.reduce((acc, slice) => acc + slice.value, 0)
  const chartSize = DONUT_CHART_SIZES[size]

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="overflow-visible">
        <div
          className="w-full overflow-visible"
          style={{ minHeight: chartSize.height }}
        >
          <ResponsiveContainer
            width="100%"
            height={chartSize.height}
            className="overflow-visible [&_.recharts-surface]:outline-none [&_.recharts-surface]:overflow-visible"
          >
            <PieChart margin={chartSize.margin}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={chartSize.innerRadius}
                outerRadius={chartSize.outerRadius}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={renderDonutSliceLabel(colors)}
                labelLine={renderDonutSliceLabelLine(colors)}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                content={(props) => (
                  <DonutTooltip
                    active={props.active}
                    payload={props.payload as unknown as DonutTooltipProps['payload']}
                    isDark={isDark}
                    total={total}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <DonutSliceLegend data={data} colors={colors} />
      </CardContent>
    </Card>
  )
}

interface LeadsVolumePoint {
  date: string
  leads: number
}

type LeadsVolumeRange = '7' | '30' | '90'

const LEADS_VOLUME_RANGE_LABELS: Record<LeadsVolumeRange, string> = {
  '7': '7 dias',
  '30': '30 dias',
  '90': '3 meses',
}

export function LeadsVolumeChart({
  data,
  timeRange,
  onTimeRangeChange,
  title = 'Leads capturados',
  description = 'Volume diário de novos leads',
}: {
  data: LeadsVolumePoint[]
  timeRange: LeadsVolumeRange
  onTimeRangeChange: (range: LeadsVolumeRange) => void
  title?: string
  description?: string
}) {
  const isDark = useDarkChartTheme()
  const primaryRaw = useChartPrimaryRaw()
  const primaryColor = chartPrimaryHsl(primaryRaw)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1">
          {(['7', '30', '90'] as LeadsVolumeRange[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {LEADS_VOLUME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={280}
          className="[&_.recharts-surface]:outline-none"
        >
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
            <XAxis
              dataKey="date"
              stroke={isDark ? '#9ca3af' : '#6b7280'}
              fontSize={11}
              interval={timeRange === '90' ? 6 : timeRange === '30' ? 2 : 0}
            />
            <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} fontSize={11} allowDecimals={false} />
            <Tooltip
              cursor={barChartTooltipCursor(isDark, primaryRaw)}
              contentStyle={tooltipPanelStyle(isDark)}
              labelStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
              itemStyle={{ color: isDark ? '#f3f4f6' : '#111827' }}
              formatter={(value) => {
                const numeric = typeof value === 'number' ? value : Number(value ?? 0)
                return [Number.isFinite(numeric) ? numeric : 0, 'Leads']
              }}
            />
            <Bar
              dataKey="leads"
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
              name="Leads"
              activeBar={
                isDark
                  ? { fill: 'hsl(var(--chart-bar-active))', radius: 4 }
                  : { fill: primaryColor, opacity: 0.88, radius: 4 }
              }
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
