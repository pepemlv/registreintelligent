import {
  TrendingUp,
  TrendingDown,
  FileStack,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Zap,
  Target,
  Layers,
  FileText,
} from 'lucide-react';
import { kpiData, departmentPerformance, documents } from '@/data';
import { formatDate } from '@/lib/documentConfig';
import { compareNewestLegacyDocuments } from '@/lib/documentSort';

export function AnalyticsView() {
  const maxDeptTotal = Math.max(...departmentPerformance.map((d) => d.total));
  const processingTrend = [2.1, 3.8, 4.2, 3.9, 3.2, 3.4];
  const volumeTrend = [198, 215, 242, 268, 275, 286];
  const months = ['Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep'];
  const expandedDeptData = [
    { department: 'Finance', total: 124, processed: 116, overdue: 8, avgDays: 3.8 },
    { department: 'Juridique', total: 67, processed: 64, overdue: 3, avgDays: 4.1 },
    { department: 'Administration', total: 98, processed: 95, overdue: 3, avgDays: 2.7 },
    { department: 'Commercial', total: 97, processed: 96, overdue: 1, avgDays: 1.9 },
  ];

  const donutSegments = [
    { label: 'Traités', value: kpiData.processed, color: 'rgb(16 185 129)', pct: (kpiData.processed / kpiData.total) * 100 },
    { label: 'En cours', value: kpiData.inProgress, color: 'rgb(245 158 11)', pct: (kpiData.inProgress / kpiData.total) * 100 },
    { label: 'En retard', value: kpiData.overdue, color: 'rgb(239 68 68)', pct: (kpiData.overdue / kpiData.total) * 100 },
  ];

  const maxVolume = Math.max(...volumeTrend);

  // Consolidated report demo
  const reportSources = [
    { dept: 'Finance', doc: 'Rapport financier Q3', status: 'Intégré', color: 'bg-accent-500' },
    { dept: 'Commercial', doc: 'Chiffres août 2026', status: 'Intégré', color: 'bg-accent-500' },
    { dept: 'Administration', doc: 'Rapport d\'activité', status: 'Intégré', color: 'bg-accent-500' },
    { dept: 'Opérations', doc: 'Suivi des activités', status: 'En attente', color: 'bg-warning-500' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MiniStat icon={FileStack} label="Total" value={kpiData.total.toString()} color="text-ink-700" bg="bg-ink-100" />
        <MiniStat icon={CheckCircle2} label="Traités" value={kpiData.processed.toString()} color="text-accent-600" bg="bg-accent-50" />
        <MiniStat icon={Clock3} label="En cours" value={kpiData.inProgress.toString()} color="text-warning-600" bg="bg-warning-50" />
        <MiniStat icon={AlertTriangle} label="En retard" value={kpiData.overdue.toString()} color="text-danger-600" bg="bg-danger-50" />
        <MiniStat icon={Zap} label="Délai moyen" value={`${kpiData.avgProcessingDays}j`} color="text-primary-600" bg="bg-primary-50" />
        <MiniStat icon={Target} label="Dans les délais" value={`${kpiData.onTimeRate}%`} color="text-accent-600" bg="bg-accent-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume trend chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-ink-900 text-base">Volume de documents</h2>
              <p className="text-xs text-ink-500">Évolution sur 6 mois</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-accent-600">
              <TrendingUp className="h-3.5 w-3.5" />
              +44% sur 6 mois
            </span>
          </div>
          <div className="p-6">
            <div className="flex items-end justify-between gap-4 h-48">
              {volumeTrend.map((vol, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex flex-col justify-end items-center" style={{ height: '100%' }}>
                    <div
                      className="w-full max-w-[48px] bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-500 group-hover:from-primary-700 group-hover:to-primary-500"
                      style={{ height: `${(vol / maxVolume) * 100}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-ink-700 bg-ink-100 px-2 py-0.5 rounded whitespace-nowrap">
                        {vol}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-ink-500">{months[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <h2 className="font-display font-bold text-ink-900 text-base">Répartition</h2>
            <p className="text-xs text-ink-500">Statuts des documents</p>
          </div>
          <div className="p-5 flex flex-col items-center">
            <div className="relative h-44 w-44">
              <svg className="h-44 w-44 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(241 245 249)" strokeWidth="14" />
                {(() => {
                  let offset = 0;
                  return donutSegments.map((seg, i) => {
                    const dash = (seg.pct / 100) * 251.3;
                    const circle = (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="14"
                        strokeDasharray={`${dash} 251.3`}
                        strokeDashoffset={-offset}
                        strokeLinecap="butt"
                      />
                    );
                    offset += dash;
                    return circle;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold text-ink-900">{kpiData.total}</span>
                <span className="text-[10px] text-ink-500 font-medium uppercase tracking-wider">Total</span>
              </div>
            </div>
            <div className="mt-4 w-full space-y-2">
              {donutSegments.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
                    <span className="text-ink-600">{seg.label}</span>
                  </div>
                  <span className="font-bold text-ink-800">{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Processing time trend */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-ink-900 text-base">Délai de traitement moyen</h2>
            <p className="text-xs text-ink-500">En jours, sur 6 mois</p>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-accent-600">
            <TrendingDown className="h-3.5 w-3.5" />
            -1.1j d'amélioration
          </span>
        </div>
        <div className="p-6">
          <div className="relative h-40">
            <svg className="w-full h-full" viewBox="0 0 600 160" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="rgb(241 245 249)" strokeWidth="1" />
              ))}
              {/* Area */}
              <path
                d={`M 0 ${160 - (processingTrend[0] / 5) * 140} L 120 ${160 - (processingTrend[1] / 5) * 140} L 240 ${160 - (processingTrend[2] / 5) * 140} L 360 ${160 - (processingTrend[3] / 5) * 140} L 480 ${160 - (processingTrend[4] / 5) * 140} L 600 ${160 - (processingTrend[5] / 5) * 140} L 600 160 L 0 160 Z`}
                fill="rgb(37 99 235 / 0.12)"
              />
              {/* Line */}
              <path
                d={`M 0 ${160 - (processingTrend[0] / 5) * 140} L 120 ${160 - (processingTrend[1] / 5) * 140} L 240 ${160 - (processingTrend[2] / 5) * 140} L 360 ${160 - (processingTrend[3] / 5) * 140} L 480 ${160 - (processingTrend[4] / 5) * 140} L 600 ${160 - (processingTrend[5] / 5) * 140}`}
                fill="none"
                stroke="rgb(28 102 242)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Points */}
              {processingTrend.map((val, i) => (
                <circle
                  key={i}
                  cx={i * 120}
                  cy={160 - (val / 5) * 140}
                  r="4"
                  fill="white"
                  stroke="rgb(28 102 242)"
                  strokeWidth="2.5"
                />
              ))}
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
              {months.map((m) => (
                <span key={m} className="text-[10px] font-medium text-ink-500">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department comparison */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <h2 className="font-display font-bold text-ink-900 text-base">Performance par service</h2>
            <p className="text-xs text-ink-500">Traités vs en retard</p>
          </div>
          <div className="p-5 space-y-4">
            {expandedDeptData.map((dept) => {
              const rate = Math.round((dept.processed / dept.total) * 100);
              return (
                <div key={dept.department}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-ink-800">{dept.department}</span>
                    <span className="text-xs font-bold text-ink-600">{rate}%</span>
                  </div>
                  <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-ink-100">
                    <div
                      className="bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-700"
                      style={{ width: `${(dept.processed / maxDeptTotal) * 100}%` }}
                    />
                    <div
                      className="bg-gradient-to-r from-danger-500 to-danger-400 transition-all duration-700"
                      style={{ width: `${(dept.overdue / maxDeptTotal) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-ink-500">{dept.processed} traités · {dept.overdue} en retard</span>
                    <span className="text-[10px] text-ink-500">Délai: {dept.avgDays}j</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Consolidated report builder */}
        <div className="bg-gradient-to-br from-white to-primary-50/40 rounded-2xl shadow-card border border-primary-200/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-primary-100/60 flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary-600" />
            <div>
              <h2 className="font-display font-bold text-ink-900 text-base">Rapport consolidé IA</h2>
              <p className="text-xs text-ink-500">Collecte, analyse et harmonisation automatique</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">Rapport mensuel — Septembre 2026</span>
            </div>
            {reportSources.map((src) => (
              <div key={src.dept} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-ink-200/60">
                <div className={`h-2 w-2 rounded-full ${src.color} ${src.status === 'En attente' ? 'animate-pulse-soft' : ''}`} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-ink-800">{src.dept}</p>
                  <p className="text-[10px] text-ink-500">{src.doc}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  src.status === 'Intégré' ? 'bg-accent-100 text-accent-700' : 'bg-warning-100 text-warning-700'
                }`}>
                  {src.status}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t border-ink-100">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-3.5 w-3.5 text-primary-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">Aperçu généré</span>
              </div>
              <p className="text-xs text-ink-700 leading-relaxed bg-white rounded-xl border border-ink-200/60 p-3">
                L'IA a consolidé 3 rapports sur 4. Synthèse : activité en croissance de 12%, 286 documents traités
                avec un taux de respect des délais de 87%. Le département Opérations est en attente de soumission.
                Recommandation : relancer le service Opérations pour finaliser le rapport consolidé.
              </p>
              <button className="w-full mt-3 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-primary-600/20 transition-all">
                <FileText className="h-3.5 w-3.5" />
                Générer le rapport complet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <h2 className="font-display font-bold text-ink-900 text-base">Activité récente</h2>
          <p className="text-xs text-ink-500">Derniers événements de traitement</p>
        </div>
        <div className="divide-y divide-ink-100">
          {[...documents].sort(compareNewestLegacyDocuments).slice(0, 6).map((doc) => (
            <div key={doc.id} className="px-5 py-3 flex items-center gap-4 hover:bg-ink-50/50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
                <FileStack className="h-4 w-4 text-ink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">{doc.title}</p>
                <p className="text-[10px] text-ink-500">
                  {doc.assignedDepartment || 'Non affecté'} · {formatDate(doc.receivedDate)}
                </p>
              </div>
              <span className="text-[10px] text-ink-400 shrink-0 hidden sm:block">
                {doc.processingTime}j
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof FileStack;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-ink-200/60 p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-display font-bold text-ink-900 leading-none">{value}</p>
        <p className="text-[10px] text-ink-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}
