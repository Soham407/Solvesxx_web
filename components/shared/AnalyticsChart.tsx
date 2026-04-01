"use client";

import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { useMemo } from "react";

const COLORS = {
  primary: "#6366f1", // Indigo
  success: "#22c55e", // Green
  critical: "#ef4444", // Red
  info: "#3b82f6",    // Blue
  warning: "#f59e0b",  // Amber
};

interface ChartProps {
  type: "area" | "bar" | "pie";
  data: any[];
  index: string; // Key for XAxis
  categories: string[]; // Keys for values
  colors?: string[];
  height?: number;
  valueFormatter?: (value: any) => string;
}

export function AnalyticsChart({ 
  type, 
  data, 
  index, 
  categories, 
  colors = [COLORS.primary, COLORS.success, COLORS.info, COLORS.warning],
  height = 300,
  valueFormatter = (val) => val.toString()
}: ChartProps) {
  const chartData = useMemo(() => data, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/5 rounded-xl border border-dashed">
        <span className="text-xs text-muted-foreground italic">No data available for the selected period</span>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case "area":
        return (
          <AreaChart data={chartData}>
            <defs>
              {categories.map((cat, i) => (
                <linearGradient key={cat} id={`gradient-${cat}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey={index} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={valueFormatter}
            />
            <Tooltip 
              formatter={valueFormatter}
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}/>
            {categories.map((cat, i) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gradient-${cat})`}
              />
            ))}
          </AreaChart>
        );
      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey={index} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={valueFormatter}
            />
            <Tooltip 
              formatter={valueFormatter}
              cursor={{ fill: "hsl(var(--muted)/0.1)" }}
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}/>
            {categories.map((cat, i) => (
              <Bar 
                key={cat} 
                dataKey={cat} 
                fill={colors[i % colors.length]} 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            ))}
          </BarChart>
        );
      case "pie":
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={8}
              dataKey={categories[0]}
              nameKey={index}
              stroke="none"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={valueFormatter}
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                borderColor: "hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
              }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}/>
          </PieChart>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ width: "100%", height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
