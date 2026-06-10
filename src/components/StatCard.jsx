const toneClasses = {
  blue: 'bg-sky-100 text-sky-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-violet-100 text-violet-700',
}

export function StatCard({ icon: Icon, label, tone = 'blue', value }) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${toneClasses[tone] ?? toneClasses.blue}`}>
        <Icon size={20} />
      </div>
      <div className="mt-4">
        <span className="text-sm text-slate-500">{label}</span>
        <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      </div>
    </article>
  )
}
