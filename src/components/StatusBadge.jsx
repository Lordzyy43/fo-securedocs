const toneClasses = {
  success: 'bg-emerald-100 text-emerald-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
  neutral: 'bg-slate-100 text-slate-700',
}

export function StatusBadge({ children, tone = 'neutral' }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone] ?? toneClasses.neutral}`}>
      {children}
    </span>
  )
}
