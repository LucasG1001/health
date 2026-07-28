import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "../../utils/format";
import styles from "./MetricLineChart.module.css";

export interface MetricPoint {
  date: string;
  value: number;
}

interface MetricLineChartProps {
  data: MetricPoint[];
  unit: string;
  goalValue?: number | null;
  height?: number;
  loading?: boolean;
}

function CustomTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: MetricPoint }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>{formatDate(point.date)}</p>
      <p className={styles.tooltipValue}>
        {point.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {unit}
      </p>
    </div>
  );
}

// As cores do gráfico vivem no CSS Module (tokens --color-*): recharts escreve stroke/fill
// como atributos de apresentação, que qualquer regra CSS sobrescreve.
export function MetricLineChart({
  data,
  unit,
  goalValue = null,
  height = 240,
  loading = false,
}: MetricLineChartProps) {
  if (loading) {
    return <div className={styles.empty}>Carregando…</div>;
  }
  if (data.length === 0) {
    return <div className={styles.empty}>Sem dados no período.</div>;
  }

  return (
    <div className={styles.container} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value).slice(0, 5)}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {goalValue != null && (
            <ReferenceLine
              y={goalValue}
              className={styles.goalLine}
              strokeDasharray="6 4"
              label={{ value: "meta", fontSize: 11, position: "insideTopRight" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            strokeWidth={2.5}
            dot={data.length <= 40 ? { r: 3, strokeWidth: 0 } : false}
            activeDot={{ r: 5, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
