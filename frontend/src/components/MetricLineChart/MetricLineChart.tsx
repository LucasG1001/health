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

const TOOLTIP_STYLE = {
  backgroundColor: "#12121a",
  border: "1px solid #2a2a40",
  borderRadius: "10px",
  padding: "10px 14px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
};

export interface MetricPoint {
  date: string;
  value: number;
}

interface MetricLineChartProps {
  data: MetricPoint[];
  unit: string;
  color?: string;
  goalValue?: number | null;
  height?: number;
}

function CustomTooltip({
  active,
  payload,
  unit,
  color,
}: {
  active?: boolean;
  payload?: { payload: MetricPoint }[];
  unit: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ color: "#9090a8", fontSize: "0.75rem", marginBottom: 4 }}>{formatDate(point.date)}</p>
      <p style={{ color, fontSize: "1rem", fontWeight: 700 }}>
        {point.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {unit}
      </p>
    </div>
  );
}

export function MetricLineChart({
  data,
  unit,
  color = "#8b5cf6",
  goalValue = null,
  height = 240,
}: MetricLineChartProps) {
  if (data.length === 0) {
    return <div className={styles.empty}>Sem dados no período.</div>;
  }

  return (
    <div className={styles.container} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#2a2a40" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#606078", fontSize: 11 }}
            tickFormatter={(value: string) => formatDate(value).slice(0, 5)}
            axisLine={{ stroke: "#2a2a40" }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#606078", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          />
          <Tooltip content={<CustomTooltip unit={unit} color={color} />} />
          {goalValue != null && (
            <ReferenceLine
              y={goalValue}
              stroke="#10b981"
              strokeDasharray="6 4"
              label={{ value: "meta", fill: "#10b981", fontSize: 11, position: "insideTopRight" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={data.length <= 40 ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: color, stroke: "#0a0a0f", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
