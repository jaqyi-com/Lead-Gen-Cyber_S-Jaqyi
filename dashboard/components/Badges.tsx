'use client';
import { CATEGORY_COLORS } from '@/lib/types';

interface Props { score: number; }

const SCORE_LABELS = ['', '🔵 Cold', '🟡 Warm', '🟠 Interested', '🔴 Hot', '🔥 Ready'];

export function ScoreBadge({ score }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border score-${score}`}>
      {SCORE_LABELS[score] ?? score}
    </span>
  );
}

interface CategoryBadgeProps { category: string; }

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category] ?? '#6b7280';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        background: color + '22',
        color,
        borderColor: color + '44',
      }}
    >
      {category}
    </span>
  );
}

interface StatusBadgeProps { status: string; }
const STATUS_STYLES: Record<string, string> = {
  New: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Contacted: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Qualified: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Closed: 'bg-green-500/20 text-green-300 border-green-500/30',
  Lost: 'bg-red-500/20 text-red-300 border-red-500/30',
};
export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES['New'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}
