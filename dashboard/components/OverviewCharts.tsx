'use client';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Props {
  byCategory: { name: string; count: number; color: string }[];
  bySource: { name: string; count: number }[];
  byScore: { score: string; count: number }[];
  scoreOverTime: { date: string; count: number; avgScore: number }[];
}

const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: {name: string; value: number}[]; label?: string}) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass px-3 py-2 text-xs text-white/80 shadow-xl">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i}><span style={{ color: p.name === 'count' ? '#7c3aed' : '#06b6d4' }}>●</span> {p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function OverviewCharts({ byCategory, bySource, byScore, scoreOverTime }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Leads over time */}
      <div className="glass p-6 col-span-2">
        <h2 className="text-sm font-semibold text-white mb-4">📈 Leads Over Last 14 Days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={scoreOverTime}>
            <defs>
              <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" name="count" stroke="#7c3aed" strokeWidth={2} fill="url(#gCount)" />
            <Area type="monotone" dataKey="avgScore" name="avgScore" stroke="#06b6d4" strokeWidth={2} fill="url(#gScore)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      <div className="glass p-6">
        <h2 className="text-sm font-semibold text-white mb-4">🗂 Leads by Category</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byCategory} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {byCategory.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Score distribution */}
      <div className="glass p-6">
        <h2 className="text-sm font-semibold text-white mb-4">🎯 Intent Score Distribution</h2>
        <div className="flex items-center gap-6 h-[200px]">
          <ResponsiveContainer width="50%" height="100%">
            <PieChart>
              <Pie
                data={byScore.filter(s => s.count > 0)}
                dataKey="count"
                nameKey="score"
                cx="50%" cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {byScore.map((_, i) => (
                  <Cell key={i} fill={['#6b7280','#3b82f6','#eab308','#f97316','#ef4444'][i]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [`${val as number} leads`, `Score ${name as string}`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 flex-1">
            {byScore.map((s, i) => (
              <div key={s.score} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full`} style={{ background: ['#6b7280','#3b82f6','#eab308','#f97316','#ef4444'][i] }} />
                <span className="text-xs text-white/50">Score {s.score}</span>
                <span className="text-xs font-semibold text-white ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
