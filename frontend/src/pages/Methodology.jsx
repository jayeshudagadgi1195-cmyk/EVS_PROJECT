import { BookOpen, BrainCircuit, Calculator, ExternalLink, Scale, Sparkles, Users } from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../hooks/useApi'
import { Badge, Card, ErrorState, PageHeader, PageSkeleton } from '../components/ui/Primitives'

export default function Methodology() {
  const { data, loading, error, reload } = useApi(api.factors)
  if (loading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div>
      <PageHeader eyebrow="Methodology" title="How EcoTrack AI calculates and predicts"
        description="Transparent formulas, published emission factors, and an honest description of what the machine-learning model can and cannot do." />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Calculator, title: 'Calculator', text: 'Emissions (kg CO₂e) = activity data × emission factor. Simple arithmetic you can check by hand.' },
          { icon: BrainCircuit, title: 'Prediction (real ML)', text: 'A Random Forest trained on 1,440 synthetic monthly records predicts next month from this month, last month and the season.' },
          { icon: Sparkles, title: 'Advisor (rule-based)', text: 'Savings = activity change × the same emission factors. Explainable rules, not machine learning.' },
        ].map(({ icon: Icon, title, text }, i) => (
          <Card key={title} delay={i * 0.05} className="card-pad">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-leaf-400/20 bg-leaf-400/10 text-mint-300"><Icon className="h-5 w-5" /></span>
            <h3 className="mt-4 text-base">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{text}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold"><BookOpen className="h-4 w-4 text-leaf-400" /> Emission factors in use</h3>
          <span className="font-mono text-xs text-zinc-500">{data.formula} · v{data.calculation_version}</span>
        </div>
        <div className="divide-y divide-white/[0.05] border-t border-white/[0.06]">
          {data.factors.map((f) => (
            <div key={f.id} className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[220px_160px_1fr]">
              <div>
                <p className="font-semibold text-white">{f.label}</p>
                <p className="font-mono text-[11px] text-zinc-500">{f.activity_type}</p>
              </div>
              <div>
                <p className="num text-lg font-bold text-mint-300">{f.factor_value}</p>
                <p className="text-[11px] text-zinc-500">{f.unit}</p>
              </div>
              <div className="text-[13px]">
                <div className="flex flex-wrap items-center gap-2">
                  {f.is_illustrative ? <Badge tone="amber">Illustrative assumption</Badge> : <Badge tone="green">Published · {f.publication_year}</Badge>}
                  {f.source_url && (
                    <a href={f.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-leaf-400 hover:text-mint-300">
                      Source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="mt-1.5 text-zinc-300">{f.source_name}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{f.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="card-pad">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold"><Users className="h-4 w-4 text-leaf-400" /> Household vs individual</h3>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
            Electricity and LPG are used by the whole household, so EcoTrack divides them equally by the number of people you enter.
            All results are therefore <b className="text-white">one person’s allocated share</b>. Enter 1 person to see the full household total.
            Transport distances are entered per person and are not divided.
          </p>
        </Card>
        <Card className="card-pad">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold"><Scale className="h-4 w-4 text-leaf-400" /> Known limitations</h3>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-zinc-400">
            <li>• Transport factors are UK (DESNZ) averages used as a proxy; Indian vehicles and bus occupancy differ.</li>
            <li>• The Indian grid factor counts CO₂ only and is a national average; state grids vary.</li>
            <li>• Food, flights, shopping and waste are not covered in this prototype.</li>
            <li>• The ML model is trained on synthetic data — a demonstration, not a validated real-world forecaster.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
