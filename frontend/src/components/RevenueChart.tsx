import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "../styles/RevenueChart.css";

export type RevenuePoint = {
  day: string;
  revenue: number;
  orders?: number;
};

type RevenueChartProps = {
  data?: RevenuePoint[];
  title?: string;
  subtitle?: string;
};

const defaultData: RevenuePoint[] = [
  { day: "Mon", revenue: 8200, orders: 18 },
  { day: "Tue", revenue: 10400, orders: 23 },
  { day: "Wed", revenue: 9200, orders: 21 },
  { day: "Thu", revenue: 12800, orders: 29 },
  { day: "Fri", revenue: 15100, orders: 34 },
  { day: "Sat", revenue: 18400, orders: 41 },
  { day: "Sun", revenue: 22100, orders: 48 },
];

function RevenueChart({
  data = defaultData,
  title = "Revenue performance",
  subtitle = "Revenue generated over the last 7 days",
}: RevenueChartProps) {
  const totalRevenue = data.reduce(
    (sum, item) => sum + item.revenue,
    0
  );

  const totalOrders = data.reduce(
    (sum, item) => sum + (item.orders ?? 0),
    0
  );

  const averageRevenue =
    data.length > 0
      ? Math.round(totalRevenue / data.length)
      : 0;

  return (
    <div className="revenue-chart-card">
      {/* HEADER */}

      <div className="revenue-chart-header">
        <div>
          <span>REVENUE ANALYTICS</span>

          <h3>{title}</h3>

          <p>{subtitle}</p>
        </div>

        <div className="revenue-period">
          <span>LAST 7 DAYS</span>
        </div>
      </div>

      {/* METRICS */}

      <div className="revenue-chart-metrics">
        <div>
          <span>TOTAL REVENUE</span>

          <strong>
            ₹{totalRevenue.toLocaleString("en-IN")}
          </strong>
        </div>

        <div>
          <span>ORDERS</span>

          <strong>{totalOrders}</strong>
        </div>

        <div>
          <span>AVG / DAY</span>

          <strong>
            ₹{averageRevenue.toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      {/* CHART */}

      <div className="revenue-chart-wrapper">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <AreaChart
            data={data}
            margin={{
              top: 8,
              right: 5,
              left: -18,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="revenueGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#8065f5"
                  stopOpacity={0.25}
                />

                <stop
                  offset="100%"
                  stopColor="#8065f5"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#20232c"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#555966",
                fontSize: 9,
              }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#555966",
                fontSize: 8,
              }}
              tickFormatter={(value) =>
                `₹${value / 1000}k`
              }
            />

            <Tooltip
              content={<RevenueTooltip />}
              cursor={{
                stroke: "#383b46",
                strokeDasharray: "3 3",
              }}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8065f5"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#8065f5",
                stroke: "#111219",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const revenue = payload[0]?.value ?? 0;

  const orders = payload[0]?.payload?.orders ?? 0;

  return (
    <div className="revenue-tooltip">
      <span>{label}</span>

      <strong>
        ₹{Number(revenue).toLocaleString("en-IN")}
      </strong>

      <small>
        {orders} orders
      </small>
    </div>
  );
}

export default RevenueChart;