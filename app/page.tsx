"use client";

import type React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LineChart,
  PanelsTopLeft,
  Plus,
  Save,
  Table2,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { BusinessPlanCumulativeChart, BusinessPlanMonthlyChart, FunnelChart, GrossProfitChart, HiringTrendChart, RevenueTrendChart, SimpleBarChart } from "@/components/charts";
import { Card, MetricCard, MetricChange, Pill, ProgressBar, SectionHeader, cn } from "@/components/ui";
import { businessPlans as seedBusinessPlans, companies as seedCompanies, experiments as seedExperiments, funnels as seedFunnels, kpiSnapshots as seedKpiSnapshots, surveys as seedSurveys, unitEconomics as seedUnitEconomics } from "@/lib/data";
import {
  BusinessPlanCountingBasis,
  BusinessPlanPeriodMode,
  KpiData,
  getBusinessPlanRows,
  getCompanyOutcomeData,
  getExecutiveKpis,
  getFunnelStages,
  hasRecognizedRevenue,
  getIndustryFunnelData,
  getLatestFunnels,
  getLostReasonData,
  getLtvCac,
  getPipelineTotals,
  getSurveySummary,
  getUnitRows,
  num,
  pct,
  rate,
  sum,
  yen
} from "@/lib/kpis";
import { deleteBusinessPlanRecord, deleteCompanyRecord, deleteFunnelRecord, fetchAppData, isSupabaseConfigured, upsertAppData, upsertBusinessPlan, upsertCompany, upsertFunnel, upsertSurvey, upsertUnitEconomics } from "@/lib/supabase-store";
import { AppData, BusinessPlan, ClientPhase, Company, CompanyStatus, Experiment, ExperimentStatus, ForecastRating, Funnel, InflowSourceFunnel, InflowSourceKey, Survey, UnitEconomics } from "@/lib/types";

type DrilldownRow = { label: string; value: string; meta?: string; companyId?: string };
type ExecutiveCard = { label: string; value: string; sub: string; tone?: "neutral" | "good" | "warn" | "bad"; formula: string; rows: DrilldownRow[]; change?: MetricChange };

const storageKey = "timee-newgrad-poc-os-data-v4";

const initialData: AppData = {
  companies: seedCompanies.slice(0, 1),
  funnels: seedFunnels.slice(0, 1),
  surveys: seedSurveys.slice(0, 1),
  unitEconomics: seedUnitEconomics.slice(0, 1),
  businessPlans: seedBusinessPlans,
  experiments: seedExperiments.slice(0, 1)
};

const displayKpiSnapshots = seedKpiSnapshots.slice(0, 1);

function formatUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getPersistenceMessage(updatedAt?: Date | null) {
  const base = isSupabaseConfigured ? "DBに保存されます" : "ブラウザ内に自動保存されます";
  return updatedAt ? `${base} / 最終更新 ${formatUpdatedAt(updatedAt)}` : base;
}

const nav = [
  { id: "executive", label: "Executive", icon: LayoutDashboard },
  { id: "sales", label: "FCST", icon: BriefcaseBusiness },
  { id: "client", label: "Client", icon: Building2 },
  { id: "businessPlan", label: "Business Plan", icon: CalendarDays },
  { id: "worker", label: "Worker", icon: UsersRound },
  { id: "hiring", label: "Hiring", icon: BarChart3 },
  { id: "unit", label: "Unit Economics", icon: LineChart }
] as const;

const statuses: CompanyStatus[] = ["リード", "初回商談", "提案中", "PoC", "契約交渉", "受注", "失注"];
const clientPhases: ClientPhase[] = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "失注"];
const forecastRatings: ForecastRating[] = ["-", "★★★", "★★", "★"];
const experimentStatuses: ExperimentStatus[] = ["未実施", "検証中", "成功", "失敗"];
const areas = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州沖縄"];
const inflowSources = [
  { key: "brazeDeliveries", label: "Braze配信" },
  { key: "calls", label: "架電" },
  { key: "surveyInterviews", label: "アンケート/IV" },
  { key: "overviewRecommendations", label: "概要推薦" }
] as const satisfies ReadonlyArray<{ key: InflowSourceKey; label: string }>;
const funnelStageKeys = ["views", "applications", "shifts", "repeatShifts", "interviewRequests", "screenings", "offers", "joins"] as const;

const clientPhaseLabels: Record<ClientPhase, string> = {
  P0: "アポ予定",
  P1: "案件の見極め",
  P2: "課題の特定",
  P3: "推進者との導入合意",
  P4: "決裁者との導入合意",
  P5: "価格・導入時期の合意",
  P6: "稟議決裁",
  P7: "申込書回収",
  失注: "失注"
};

const statusStyle: Record<CompanyStatus, string> = {
  リード: "border-stone-200 bg-stone-50 text-stone-700",
  初回商談: "border-amber-200 bg-amber-50 text-amber-800",
  提案中: "border-yellow-300 bg-yellow-50 text-yellow-800",
  PoC: "border-orange-200 bg-orange-50 text-orange-800",
  契約交渉: "border-amber-200 bg-amber-50 text-amber-700",
  受注: "border-green-200 bg-green-50 text-green-700",
  失注: "border-red-200 bg-red-50 text-red-700"
};

const phaseStyle: Record<ClientPhase, string> = {
  P0: "border-stone-200 bg-stone-50 text-stone-700",
  P1: "border-yellow-200 bg-yellow-50 text-yellow-800",
  P2: "border-amber-200 bg-amber-50 text-amber-800",
  P3: "border-orange-200 bg-orange-50 text-orange-800",
  P4: "border-blue-200 bg-blue-50 text-blue-800",
  P5: "border-sky-200 bg-sky-50 text-sky-800",
  P6: "border-emerald-200 bg-emerald-50 text-emerald-800",
  P7: "border-green-200 bg-green-50 text-green-700",
  失注: "border-red-200 bg-red-50 text-red-700"
};

const forecastStyle: Record<ForecastRating, string> = {
  "★★★": "border-green-200 bg-green-50 text-green-700",
  "★★": "border-yellow-200 bg-yellow-50 text-yellow-800",
  "★": "border-stone-200 bg-stone-50 text-stone-700",
  "-": "border-stone-200 bg-white text-muted"
};

export default function Home() {
  const [active, setActive] = useState<(typeof nav)[number]["id"]>("executive");
  const [pipelineMode, setPipelineMode] = useState<"table" | "kanban">("table");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [data, setData] = useState<AppData>(initialData);
  const [savedMessage, setSavedMessage] = useState(getPersistenceMessage());
  const [hasLocalBackup, setHasLocalBackup] = useState(false);

  useEffect(() => {
    setHasLocalBackup(Boolean(window.localStorage.getItem(storageKey)));

    if (isSupabaseConfigured) {
      fetchAppData()
        .then((remoteData) => {
          setData(normalizeAppData(remoteData));
          const updatedAt = new Date();
          setSavedMessage(`DBから読み込みました / 最終更新 ${formatUpdatedAt(updatedAt)}`);
          window.setTimeout(() => setSavedMessage(getPersistenceMessage(updatedAt)), 2200);
        })
        .catch(() => setSavedMessage("DBの読み込みに失敗しました"));
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      setData(normalizeAppData({ ...initialData, ...JSON.parse(raw) }));
    } catch {
      setSavedMessage("保存データの読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) return;
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  const kpiData = useMemo<KpiData>(() => ({
    companies: data.companies,
    funnels: getLatestFunnels(data.funnels),
    surveys: data.surveys,
    unitEconomics: data.unitEconomics,
    businessPlans: data.businessPlans
  }), [data]);
  const executive = getExecutiveKpis(kpiData);

  function afterSave(message: string) {
    const updatedAt = new Date();
    setSavedMessage(`${message} / 最終更新 ${formatUpdatedAt(updatedAt)}`);
    window.setTimeout(() => setSavedMessage(getPersistenceMessage(updatedAt)), 2200);
  }

  async function migrateLocalStorageToSupabase() {
    if (!isSupabaseConfigured) {
      setSavedMessage("DB接続の環境変数が未設定です");
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setSavedMessage("移行できるブラウザ保存データがありません");
      return;
    }

    try {
      const localData = normalizeAppData({ ...initialData, ...JSON.parse(raw) });
      const migratedData = await upsertAppData(localData);
      setData(migratedData);
      window.localStorage.removeItem(storageKey);
      setHasLocalBackup(false);
      const updatedAt = new Date();
      setSavedMessage(`ブラウザ保存データをDBへ移行しました / 最終更新 ${formatUpdatedAt(updatedAt)}`);
      window.setTimeout(() => setSavedMessage(getPersistenceMessage(updatedAt)), 2600);
    } catch {
      setSavedMessage("DBへの移行に失敗しました");
    }
  }

  return (
    <main className="min-h-screen">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-line bg-white/95 p-5 shadow-soft backdrop-blur lg:block">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg border border-yellow-300 bg-accent text-sm font-black text-ink shadow-sm">T</div>
          <div>
            <div className="text-sm font-semibold text-ink">新卒採用事業 Dashboard</div>
            <div className="text-xs text-muted">新卒採用 事業検証</div>
          </div>
        </div>
        <div className="mt-7 px-3 text-[10px] font-bold uppercase tracking-wider text-muted">Workspace</div>
        <nav className="mt-2 space-y-1">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-muted transition hover:bg-yellow-50 hover:text-ink", active === item.id && "bg-accent text-ink shadow-sm")}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="text-xs font-medium text-muted">10社導入目標</div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-semibold">{executive.introduced}/10 社</span>
            <span className="text-muted">{pct(executive.progress)}</span>
          </div>
          <ProgressBar value={executive.progress} className="mt-3" />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-white/85 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-xs font-medium text-muted">
                <Activity className="size-3.5" />
                FY27 新卒事業PoC Management
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-normal text-ink">新卒採用事業 Dashboard</h1>
              <p className="mt-1 text-sm text-muted">営業、ファネル、採用成果、採算をひとつの検証ラインで見るPoCダッシュボード</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill className="border-yellow-200 bg-yellow-50 text-ink">{savedMessage}</Pill>
              {isSupabaseConfigured && hasLocalBackup ? (
                <button onClick={migrateLocalStorageToSupabase} className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-success hover:bg-green-100">
                  <Save className="size-4" />
                  ブラウザ保存データを移行
                </button>
              ) : null}
              <button onClick={() => setActive("sales")} className="inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-accent px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-accent-strong">
                <Plus className="size-4" />
                FCST入力
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
            {nav.map((item) => (
              <button key={item.id} onClick={() => setActive(item.id)} className={cn("rounded-md border border-line bg-white px-3 py-2 text-xs font-medium text-muted", active === item.id && "border-yellow-300 bg-accent text-ink")}>
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          {active === "executive" && <ExecutiveView data={kpiData} onSelectCompany={setSelectedCompany} />}
          {active === "sales" && <SalesView data={kpiData} setData={setData} afterSave={afterSave} mode={pipelineMode} setMode={setPipelineMode} onSelect={setSelectedCompany} />}
          {active === "client" && <ClientView data={kpiData} setData={setData} afterSave={afterSave} onSelect={setSelectedCompany} />}
          {active === "businessPlan" && <BusinessPlanView data={kpiData} setData={setData} afterSave={afterSave} onSelect={setSelectedCompany} />}
          {active === "worker" && <WorkerView data={{ ...kpiData, funnels: data.funnels }} setData={setData} afterSave={afterSave} onSelectCompany={setSelectedCompany} />}
          {active === "hiring" && <HiringView data={kpiData} />}
          {active === "unit" && <UnitView data={kpiData} setData={setData} afterSave={afterSave} />}
        </div>
      </div>

      {selectedCompany ? (
        <CompanyModal
          data={kpiData}
          company={selectedCompany}
          setData={setData}
          afterSave={afterSave}
          onCompanyChange={setSelectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      ) : null}
    </main>
  );
}

function ExecutiveView({ data, onSelectCompany }: { data: KpiData; onSelectCompany: (company: Company) => void }) {
  const [drilldown, setDrilldown] = useState<ExecutiveCard | null>(null);
  const kpis = getExecutiveKpis(data);
  const weekly = getWeeklyExecutiveComparison(data);
  const trendData = getExecutiveTrendData(data);
  const wonCompanies = data.companies.filter((company) => company.status === "受注");
  const contractedCompanies = data.companies.filter((company) => hasRecognizedRevenue(company));
  const averageArpu = Math.round(sum(contractedCompanies, (company) => company.expectedMrr) / Math.max(1, contractedCompanies.length));
  const leadTimeCompanies = wonCompanies.filter((company) => getLeadTimeDays(company) !== null);
  const averageLeadTime = Math.round(sum(leadTimeCompanies, (company) => getLeadTimeDays(company) ?? 0) / Math.max(1, leadTimeCompanies.length));
  const proposalCompanies = data.companies.filter((company) => Boolean(company.proposalDate));
  const dealStageCompanies = data.companies.filter((company) => company.status !== "リード");
  const latestFunnels = getLatestFunnels(data.funnels);
  const latestUnit = data.unitEconomics[data.unitEconomics.length - 1];
  const contractedArrForecast = sum(contractedCompanies, getArrForecast);
  const companyRows = (companies: Company[], value: (company: Company) => string): DrilldownRow[] => companies.map((company) => ({
    label: company.name,
    value: value(company),
    meta: `${company.industry} / ${company.area} / ${company.status}`,
    companyId: company.id
  }));
  const funnelRows = (value: (funnel: Funnel) => number, suffix: string): DrilldownRow[] => latestFunnels.map((funnel) => ({
    label: getCompanyName(data, funnel.companyId),
    value: `${num(value(funnel))}${suffix}`,
    meta: funnel.recordedAt,
    companyId: data.companies.some((company) => company.id === funnel.companyId) ? funnel.companyId : undefined
  }));
  const cards: ExecutiveCard[] = [
    { label: "導入社数", value: `${kpis.introduced}社`, sub: `目標進捗 ${pct(kpis.progress)}`, change: weekly.introduced, formula: "ステータスが受注の企業数", rows: companyRows(wonCompanies, (company) => company.contractStartDate ?? "-") },
    { label: "提案社数", value: `${kpis.proposals}社`, sub: "提案日あり", change: weekly.proposals, formula: "提案日が入力されている企業数", rows: companyRows(proposalCompanies, (company) => company.proposalDate ?? "-") },
    { label: "商談化率", value: pct(kpis.meetingRate), sub: "リード以外 / 全社", change: weekly.meetingRate, formula: `${dealStageCompanies.length}社 / ${data.companies.length}社`, rows: companyRows(dealStageCompanies, (company) => company.status) },
    { label: "受注率", value: pct(kpis.winRate), sub: "受注 / 提案", change: weekly.winRate, formula: `${wonCompanies.length}社 / ${proposalCompanies.length}社`, rows: companyRows(proposalCompanies, (company) => company.status) },
    { label: "提案→受注CVR", value: pct(kpis.winRate), sub: `${kpis.introduced}社 / ${kpis.proposals}社`, change: weekly.winRate, formula: "受注企業数 / 提案済み企業数", rows: companyRows(proposalCompanies, (company) => company.status) },
    { label: "受注リードタイム", value: `${num(averageLeadTime)}日`, sub: `初回商談→申込書回収 / ${leadTimeCompanies.length}社`, change: weekly.leadTime, formula: "受注企業ごとの 申込書回収日 - 初回商談日 の平均", rows: leadTimeCompanies.map((company) => ({ label: company.name, value: `${num(getLeadTimeDays(company) ?? 0)}日`, meta: `${company.initialMeetingDate ?? "-"} → ${company.applicationReceivedDate ?? "-"}`, companyId: company.id })) },
    { label: "MRR合計", value: yen(kpis.mrr), sub: "P7 / 契約開始日以降", change: weekly.mrr, formula: "P7申込書回収、かつ契約開始日が未入力または今日以前の企業の想定MRR合計", rows: companyRows(contractedCompanies, (company) => yen(company.expectedMrr)) },
    { label: "ARR見込み", value: yen(contractedArrForecast), sub: "P7 / 契約開始日以降", change: weekly.arrForecast, formula: "P7申込書回収、かつ契約開始日が未入力または今日以前の企業ごとの 想定MRR × 契約期間 の合計", rows: companyRows(contractedCompanies, (company) => yen(getArrForecast(company))) },
    { label: "ARPU", value: yen(averageArpu), sub: `対象${contractedCompanies.length}社の平均MRR`, change: weekly.arpu, formula: "MRR反映対象企業のMRR合計 / MRR反映対象企業数", rows: companyRows(contractedCompanies, (company) => yen(company.expectedMrr)) },
    { label: "成功報酬累計", value: yen(kpis.successFees), sub: "入社数ベース", change: weekly.successFees, formula: "入社予定者数 × 400,000円", rows: latestFunnels.map((funnel) => ({ label: getCompanyName(data, funnel.companyId), value: yen(funnel.joins * 400000), meta: `入社 ${num(funnel.joins)}人`, companyId: data.companies.some((company) => company.id === funnel.companyId) ? funnel.companyId : undefined })) },
    { label: "ワーカー送客数", value: `${num(kpis.referrals)}人`, sub: "応募数", change: weekly.referrals, formula: "企業別応募数の合計", rows: funnelRows((funnel) => funnel.applications, "人") },
    { label: "職場体験実施数", value: `${num(kpis.shifts)}件`, sub: "タイミー勤務", change: weekly.shifts, formula: "企業別タイミー勤務数の合計", rows: funnelRows((funnel) => funnel.shifts, "件") },
    { label: "面談数", value: `${num(kpis.interviews)}件`, sub: "面談希望", change: weekly.interviews, formula: "企業別面談希望数の合計", rows: funnelRows((funnel) => funnel.interviewRequests, "件") },
    { label: "内定者数", value: `${num(kpis.offers)}人`, sub: "選考通過", change: weekly.offers, formula: "企業別内定数の合計", rows: funnelRows((funnel) => funnel.offers, "人") },
    { label: "入社予定者数", value: `${num(kpis.joins)}人`, sub: "入社承諾", change: weekly.joins, formula: "企業別入社予定者数の合計", rows: funnelRows((funnel) => funnel.joins, "人") },
    { label: "1社あたり粗利", value: yen(kpis.grossProfitPerCompany), sub: "MRR + 成功報酬 - 運用費", change: weekly.grossProfitPerCompany, tone: "good", formula: "(MRR + 成功報酬 - 月間運用コスト) / 受注企業数", rows: [{ label: "MRR", value: yen(kpis.mrr) }, { label: "成功報酬", value: yen(kpis.successFees) }, { label: "月間運用コスト", value: `-${yen(latestUnit?.operatingCost ?? 0)}` }, { label: "受注企業数", value: `${num(wonCompanies.length)}社` }] },
    { label: "10社目標進捗率", value: pct(kpis.progress), sub: "3ヶ月PoC", change: weekly.progress, tone: "good", formula: "導入社数 / 10社目標", rows: companyRows(wonCompanies, (company) => company.contractStartDate ?? "-") }
  ];
  return (
    <div className="space-y-6">
      <SectionHeader title="Executive Dashboard" description="案件管理ではなく、モデル成立性、刺さる業界、学生の行動変容、採算性を同時に見る経営サマリーです。" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button key={card.label} type="button" onClick={() => setDrilldown(card)} className="text-left">
            <MetricCard label={card.label} value={card.value} sub={card.sub} tone={card.tone ?? "neutral"} change={card.change} />
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">KPI推移: 内定・入社</div>
            <Pill className="border-yellow-200 bg-yellow-50 text-muted">monthly</Pill>
          </div>
          <HiringTrendChart data={trendData} />
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">KPI推移: MRR・ARR見込み</div>
            <Pill className="border-yellow-200 bg-yellow-50 text-muted">monthly</Pill>
          </div>
          <RevenueTrendChart data={trendData} />
        </Card>
      </div>
      <Card className="p-5">
        <div className="text-sm font-semibold">価値仮説の現在地</div>
        <div className="mt-4 space-y-4">
          <ValueSignal label="再勤務率" value={pct(rate(sum(data.funnels, (f) => f.repeatShifts), sum(data.funnels, (f) => f.shifts)))} score={rate(sum(data.funnels, (f) => f.repeatShifts), sum(data.funnels, (f) => f.shifts))} />
          <ValueSignal label="面談化率" value={pct(rate(sum(data.funnels, (f) => f.interviewRequests), sum(data.funnels, (f) => f.shifts)))} score={rate(sum(data.funnels, (f) => f.interviewRequests), sum(data.funnels, (f) => f.shifts)) * 2.5} />
          <ValueSignal label="内定率" value={pct(rate(sum(data.funnels, (f) => f.offers), sum(data.funnels, (f) => f.screenings)))} score={rate(sum(data.funnels, (f) => f.offers), sum(data.funnels, (f) => f.screenings)) * 1.6} />
        </div>
      </Card>
      {drilldown ? (
        <ExecutiveDrilldownModal
          card={drilldown}
          companies={data.companies}
          onSelectCompany={(company) => {
            setDrilldown(null);
            onSelectCompany(company);
          }}
          onClose={() => setDrilldown(null)}
        />
      ) : null}
    </div>
  );
}

function SalesView({
  data,
  setData,
  afterSave,
  mode,
  setMode,
  onSelect
}: {
  data: KpiData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  mode: "table" | "kanban";
  setMode: (mode: "table" | "kanban") => void;
  onSelect: (company: Company) => void;
}) {
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const totals = getPipelineTotals(data);
  const kpis = getExecutiveKpis(data);
  const arrForecastCompanies = data.companies.filter((company) => hasRecognizedRevenue(company) && getArrForecast(company) > 0);
  const arrForecast = sum(arrForecastCompanies, getArrForecast);
  const weekly = getWeeklySalesComparison(data);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="FCST"
        description="企業営業、契約見込み、MRR、成功報酬、失注理由を管理します。"
        action={<div className="flex flex-wrap gap-2"><button onClick={() => setIsAddingCompany(true)} className="inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-accent px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-accent-strong"><Plus className="size-4" />案件を入力</button><div className="inline-flex rounded-md border border-line bg-white p-1"><button className={cn("grid size-8 place-items-center rounded text-muted", mode === "table" && "bg-accent text-ink")} onClick={() => setMode("table")} title="テーブル表示"><Table2 className="size-4" /></button><button className={cn("grid size-8 place-items-center rounded text-muted", mode === "kanban" && "bg-accent text-ink")} onClick={() => setMode("kanban")} title="カンバン表示"><PanelsTopLeft className="size-4" /></button></div></div>}
      />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="オープン案件 想定MRR" value={yen(totals.expectedMrr)} sub="失注・受注を除く" change={weekly.expectedMrr} />
        <MetricCard label="契約済みMRR" value={yen(totals.contractedMrr)} sub="P7 / 契約開始日以降" tone="good" change={weekly.contractedMrr} />
        <MetricCard label="想定成功報酬パイプライン" value={yen(totals.expectedSuccessFee)} sub="想定人数 × 単価" change={weekly.expectedSuccessFee} />
        <MetricCard label="ARR見込み" value={yen(arrForecast)} sub="P7 / 契約開始日以降" tone="good" change={weekly.arrForecast} />
        <MetricCard label="ARR見込み案件数" value={`${num(arrForecastCompanies.length)}件`} sub="MRR反映対象案件" change={weekly.arrForecastCompanies} />
        <MetricCard label="提案→受注CVR" value={pct(kpis.winRate)} sub={`${kpis.introduced}社 / ${kpis.proposals}社`} tone="good" change={weekly.winRate} />
      </div>
      {mode === "table" ? <PipelineTable companies={data.companies} onSelect={onSelect} /> : <Kanban companies={data.companies} onSelect={onSelect} />}
      <Card>
        <div className="mb-4 text-sm font-semibold">失注理由分析</div>
        <SimpleBarChart data={getLostReasonData(data)} xKey="reason" bars={[{ key: "count", name: "件数", color: "#dc2626" }]} />
      </Card>
      <SidePanel title="案件を入力" open={isAddingCompany} onClose={() => setIsAddingCompany(false)}>
        <CompanyForm setData={setData} afterSave={afterSave} onDone={() => setIsAddingCompany(false)} />
      </SidePanel>
    </div>
  );
}

function PipelineTable({ companies, onSelect }: { companies: Company[]; onSelect: (company: Company) => void }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1260px] text-left text-sm">
          <thead className="border-b border-line bg-yellow-50 text-xs text-muted">
            <tr>{["企業名", "業界", "エリア", "担当", "FCSTステータス", "商談ステータス", "受注ヨミ", "契約期間", "ARR見込み", "想定MRR", "成功報酬", "採用人数", "提案日", "契約予定日", "契約開始日", "操作"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} onClick={() => onSelect(company)} className="cursor-pointer border-b border-line bg-white transition last:border-0 hover:bg-yellow-50/70">
                <td className="px-4 py-3 font-medium text-ink">{company.name}</td>
                <td className="px-4 py-3 text-muted">{company.industry}</td>
                <td className="px-4 py-3 text-muted">{company.area}</td>
                <td className="px-4 py-3 text-muted">{company.owner}</td>
                <td className="px-4 py-3"><Pill className={statusStyle[company.status]}>{company.status}</Pill></td>
                <td className="px-4 py-3"><Pill className={phaseStyle[getClientPhase(company)]}>{formatClientPhaseOption(getClientPhase(company))}</Pill></td>
                <td className="px-4 py-3"><ForecastPill rating={getForecastRating(company)} /></td>
                <td className="px-4 py-3">{company.contractMonths ?? 0}ヶ月</td>
                <td className="px-4 py-3 font-semibold text-ink">{yen(getArrForecast(company))}</td>
                <td className="px-4 py-3">{yen(company.expectedMrr)}</td>
                <td className="px-4 py-3">{yen(company.successFee)}</td>
                <td className="px-4 py-3">{company.expectedHires}人</td>
                <td className="px-4 py-3 text-muted">{company.proposalDate ?? "-"}</td>
                <td className="px-4 py-3 text-muted">{company.contractTargetDate ?? "-"}</td>
                <td className="px-4 py-3 text-muted">{company.contractStartDate ?? "-"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(company);
                    }}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-line px-2.5 text-xs font-medium text-muted hover:bg-panel"
                  >
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Kanban({ companies, onSelect }: { companies: Company[]; onSelect: (company: Company) => void }) {
  return (
    <div className="grid gap-3 overflow-x-auto xl:grid-cols-7">
      {statuses.map((status) => {
        const items = companies.filter((company) => company.status === status);
        return (
          <div key={status} className="min-w-64 rounded-lg border border-line bg-yellow-50/60 p-3 shadow-soft">
            <div className="flex items-center justify-between"><Pill className={statusStyle[status]}>{status}</Pill><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-muted">{items.length}</span></div>
            <div className="mt-3 space-y-2">
              {items.map((company) => (
                <button key={company.id} onClick={() => onSelect(company)} className="w-full rounded-md border border-line bg-white p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-yellow-300 hover:bg-yellow-50/40">
                  <div className="font-medium text-ink">{company.name}</div>
                  <div className="mt-1 text-xs text-muted">{company.industry} / {company.area} / {company.owner}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted">ARR</span><div className="font-semibold text-ink">{yen(getArrForecast(company))}</div></div>
                    <div><span className="text-muted">契約</span><div className="font-semibold text-ink">{company.contractMonths ?? 0}ヶ月</div></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClientView({
  data,
  setData,
  afterSave,
  onSelect
}: {
  data: KpiData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  onSelect: (company: Company) => void;
}) {
  const [isAddingClient, setIsAddingClient] = useState(false);
  const clients = data.companies;
  const nonLostClients = clients.filter((company) => getClientPhase(company) !== "失注");
  const phaseCounts = Object.fromEntries(clientPhases.map((phase) => [phase, clients.filter((company) => getClientPhase(company) === phase).length])) as Record<ClientPhase, number>;
  const p7Clients = clients.filter((company) => getClientPhase(company) === "P7");
  const decisionClients = clients.filter((company) => ["P4", "P5", "P6"].includes(getClientPhase(company)));
  const averagePhaseIndex = nonLostClients.length > 0 ? Math.round(sum(nonLostClients, (company) => clientPhases.indexOf(getClientPhase(company))) / nonLostClients.length) : 0;
  const averagePhase = clientPhases[Math.min(averagePhaseIndex, 7)];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Client"
        description="登録済みクライアントの商談フェーズをP0〜P7で管理します。FCSTステータスとは分けて、導入合意と申込書回収までの進捗を追います。"
        action={<button onClick={() => setIsAddingClient(true)} className="inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-accent px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-accent-strong"><Plus className="size-4" />Pipeline作成</button>}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="管理クライアント" value={`${num(clients.length)}社`} sub="登録済み" />
        <MetricCard label="申込書回収" value={`${num(p7Clients.length)}社`} sub="P7到達" tone="good" />
        <MetricCard label="決裁合意〜稟議" value={`${num(decisionClients.length)}社`} sub="P4-P6" />
        <MetricCard label="平均フェーズ" value={averagePhase} sub={clientPhaseLabels[averagePhase] ?? "未設定"} />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1680px] grid-cols-9 gap-3 p-4">
            {clientPhases.map((phase) => {
              const items = clients.filter((company) => getClientPhase(company) === phase);
              return (
                <div key={phase} className="rounded-lg border border-line bg-yellow-50/50 p-3">
                  <div className="flex min-h-12 items-start justify-between gap-2">
                    <div>
                      <Pill className={phaseStyle[phase]}>{phase}</Pill>
                      <div className="mt-2 text-xs font-semibold leading-5 text-ink">{clientPhaseLabels[phase]}</div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-muted">{phaseCounts[phase]}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {items.map((company) => (
                      <div key={company.id} className="rounded-md border border-line bg-white p-3 shadow-soft">
                        <button type="button" onClick={() => onSelect(company)} className="block w-full text-left">
                          <div className="font-semibold text-ink">{company.name}</div>
                          <div className="mt-1 text-xs text-muted">{company.industry} / {company.area}</div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted">FCST</span>
                            <Pill className={statusStyle[company.status]}>{company.status}</Pill>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted">受注ヨミ</span>
                            <ForecastPill rating={getForecastRating(company)} />
                          </div>
                          <div className="mt-2 rounded-md bg-panel px-2 py-1.5 text-xs text-muted">
                            NA予定日: <span className="font-semibold text-ink">{company.naScheduledDate ?? "-"}</span>
                          </div>
                        </button>
                      </div>
                    ))}
                    {items.length === 0 ? <div className="rounded-md border border-dashed border-line bg-white/70 p-3 text-center text-xs text-muted">該当なし</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-panel px-4 py-3 text-sm font-semibold">クライアント一覧</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-yellow-50 text-xs text-muted">
              <tr>{["企業名", "商談フェーズ", "受注ヨミ", "NA予定日", "FCSTステータス", "業界", "エリア", "担当", "MRR", "ARR見込み", "商談メモ"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody>
              {data.companies.map((company) => {
                const phase = getClientPhase(company);
                return (
                  <tr key={company.id} onClick={() => onSelect(company)} className="cursor-pointer border-b border-line last:border-0 hover:bg-yellow-50/70">
                    <td className="px-4 py-3 font-medium text-ink">{company.name}</td>
                    <td className="px-4 py-3"><Pill className={phaseStyle[phase]}>{formatClientPhaseOption(phase)}</Pill></td>
                    <td className="px-4 py-3"><ForecastPill rating={getForecastRating(company)} /></td>
                    <td className="px-4 py-3 text-muted">{company.naScheduledDate ?? "-"}</td>
                    <td className="px-4 py-3"><Pill className={statusStyle[company.status]}>{company.status}</Pill></td>
                    <td className="px-4 py-3 text-muted">{company.industry}</td>
                    <td className="px-4 py-3 text-muted">{company.area}</td>
                    <td className="px-4 py-3 text-muted">{company.owner}</td>
                    <td className="px-4 py-3">{yen(company.expectedMrr)}</td>
                    <td className="px-4 py-3">{yen(getArrForecast(company))}</td>
                    <td className="max-w-72 px-4 py-3 text-muted">{company.dealMemo || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <SidePanel title="Pipeline作成" open={isAddingClient} onClose={() => setIsAddingClient(false)}>
        <CompanyForm setData={setData} afterSave={afterSave} onDone={() => setIsAddingClient(false)} title="クライアントを追加" />
      </SidePanel>
    </div>
  );
}

type BusinessPlanRow = ReturnType<typeof getBusinessPlanRows>[number];

function BusinessPlanView({
  data,
  setData,
  afterSave,
  onSelect
}: {
  data: KpiData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  onSelect: (company: Company) => void;
}) {
  const defaultMonth = getDefaultBusinessPlanMonth(data);
  const [basis, setBasis] = useState<BusinessPlanCountingBasis>("application");
  const [periodMode, setPeriodMode] = useState<BusinessPlanPeriodMode>("year");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [startMonth, setStartMonth] = useState(getFiscalYearStart(defaultMonth));
  const [endMonth, setEndMonth] = useState(getFiscalYearEnd(defaultMonth));
  const [editingPlan, setEditingPlan] = useState<BusinessPlan | null>(null);
  const [isPlanPanelOpen, setIsPlanPanelOpen] = useState(false);

  const months = getBusinessPlanPeriodMonths(periodMode, selectedMonth, startMonth, endMonth);
  const rows = getFilledBusinessPlanRows(data, basis, months);
  const totals = getBusinessPlanSummary(rows);
  const chartRows = rows.map((row) => ({
    month: row.month,
    targetCompanies: row.targetCompanies,
    actualCompanies: row.actualCompanies,
    pipelineStar3: row.pipelineStar3,
    pipelineStar2: row.pipelineStar2,
    pipelineStar1: row.pipelineStar1
  }));
  const cumulativeRows = getBusinessPlanCumulativeRows(rows);
  const uncountedCompanies = data.companies.filter((company) => rows.some((row) => row.uncountedP7CompanyIds.includes(company.id)));

  function openPlanEditor(plan?: BusinessPlan | null, month = selectedMonth) {
    setEditingPlan(plan ?? { id: crypto.randomUUID(), month, targetCompanies: 0, memo: "" });
    setIsPlanPanelOpen(true);
  }

  async function deletePlan(plan: BusinessPlan) {
    if (isSupabaseConfigured) {
      try {
        await deleteBusinessPlanRecord(plan.id);
      } catch {
        afterSave("月次計画の削除に失敗しました。DB設定を確認してください");
        return;
      }
    }
    setData((state) => ({
      ...state,
      businessPlans: state.businessPlans.filter((item) => item.id !== plan.id)
    }));
    afterSave("月次計画を削除しました");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Business Plan"
        description="月次の導入社数計画に対して、実績と契約予定日ベースのヨミ積み上げを確認します。"
        action={<button onClick={() => openPlanEditor(data.businessPlans?.find((plan) => plan.month === selectedMonth), selectedMonth)} className="inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-accent px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-accent-strong"><Plus className="size-4" />月次計画を編集</button>}
      />

      <Card>
        <div className="grid gap-4 lg:grid-cols-5">
          <Select label="表示期間" value={periodMode} options={[{ value: "single", label: "単月" }, { value: "range", label: "指定期間" }, { value: "year", label: "通年" }]} onChange={(value) => setPeriodMode(value as BusinessPlanPeriodMode)} />
          <Select label="実績計上基準" value={basis} options={[{ value: "application", label: "申込書回収ベース" }, { value: "contractStart", label: "契約開始ベース" }]} onChange={(value) => setBasis(value as BusinessPlanCountingBasis)} />
          {periodMode === "single" ? <Input label="対象月" type="month" value={selectedMonth} onChange={setSelectedMonth} /> : null}
          {periodMode !== "single" ? <Input label="開始月" type="month" value={startMonth} onChange={setStartMonth} /> : null}
          {periodMode !== "single" ? <Input label="終了月" type="month" value={endMonth} onChange={setEndMonth} /> : null}
          <ReadOnlyField label="Pipeline集計" value="契約予定日ベース" />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="計画導入社数" value={`${num(totals.target)}社`} sub={formatMonthRangeLabel(months)} />
        <MetricCard label="実績導入社数" value={`${num(totals.actual)}社`} sub={basis === "application" ? "P7 + 申込書回収日 + 契約開始日" : "P7 + 契約開始日"} tone="good" />
        <MetricCard label="実績達成率" value={pct(rate(totals.actual, totals.target))} sub={`差分 ${formatSignedNumber(totals.actual - totals.target)}社`} tone={totals.actual >= totals.target ? "good" : "warn"} />
        <MetricCard label="標準着地見込み" value={`${num(totals.standard)}社`} sub="実績 + ★★★ + ★★" tone={totals.standard >= totals.target ? "good" : "warn"} />
        <MetricCard label="Pipeline ★★★ / ★★" value={`${num(totals.star3)} / ${num(totals.star2)}社`} sub={`★ ${num(totals.star1)}社 / 未設定 ${num(totals.unset)}社`} />
        <MetricCard label="未計上P7" value={`${num(totals.uncountedP7)}社`} sub="必要日付が未入力" tone={totals.uncountedP7 > 0 ? "warn" : "neutral"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-4 text-sm font-semibold">月次 予実 & Pipelineヨミ</div>
          <BusinessPlanMonthlyChart data={chartRows} />
        </Card>
        <Card>
          <div className="mb-4 text-sm font-semibold">累計 計画 vs 実績 vs 標準着地</div>
          <BusinessPlanCumulativeChart data={cumulativeRows} />
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
          <div className="text-sm font-semibold">月次予実テーブル</div>
          <Pill className="border-yellow-200 bg-yellow-50 text-muted">Pipelineは契約予定日ベース</Pill>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="border-b border-line bg-yellow-50 text-xs text-muted">
              <tr>{["月", "計画", "実績", "差分", "達成率", "★★★", "★★", "★", "標準着地", "標準差分", "未計上P7", "対象企業", "メモ", "操作"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const plan = row.plan ?? data.businessPlans?.find((item) => item.month === row.month) ?? null;
                const actualCompanies = row.actualCompanyIds.map((id) => data.companies.find((company) => company.id === id)).filter(Boolean) as Company[];
                return (
                  <tr key={row.month} className="border-b border-line last:border-0 hover:bg-yellow-50/70">
                    <td className="px-4 py-3 font-medium text-ink">{row.month}</td>
                    <td className="px-4 py-3">{num(row.targetCompanies)}社</td>
                    <td className="px-4 py-3 font-semibold text-success">{num(row.actualCompanies)}社</td>
                    <td className={cn("px-4 py-3 font-semibold", row.gap >= 0 ? "text-success" : "text-danger")}>{formatSignedNumber(row.gap)}社</td>
                    <td className="px-4 py-3">{pct(row.achievementRate)}</td>
                    <td className="px-4 py-3">{num(row.pipelineStar3)}社</td>
                    <td className="px-4 py-3">{num(row.pipelineStar2)}社</td>
                    <td className="px-4 py-3">{num(row.pipelineStar1)}社</td>
                    <td className="px-4 py-3 font-semibold text-ink">{num(row.standard)}社</td>
                    <td className={cn("px-4 py-3 font-semibold", row.standardGap >= 0 ? "text-success" : "text-danger")}>{formatSignedNumber(row.standardGap)}社</td>
                    <td className="px-4 py-3">{num(row.uncountedP7)}社</td>
                    <td className="px-4 py-3">
                      {actualCompanies.length === 0 ? <span className="text-muted">-</span> : (
                        <div className="flex flex-wrap gap-1">
                          {actualCompanies.map((company) => <button key={company.id} type="button" onClick={() => onSelect(company)} className="rounded-full border border-line bg-white px-2 py-0.5 text-xs font-medium text-ink hover:bg-yellow-50">{company.name}</button>)}
                        </div>
                      )}
                    </td>
                    <td className="max-w-64 px-4 py-3 text-muted">{row.plan?.memo || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openPlanEditor(plan, row.month)} className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-2.5 text-xs font-medium text-muted hover:bg-panel">編集</button>
                        {plan ? <BusinessPlanDeleteButton plan={plan} onDelete={deletePlan} /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {uncountedCompanies.length > 0 ? (
        <Card>
          <div className="mb-3 text-sm font-semibold">未計上P7の確認</div>
          <div className="grid gap-2 md:grid-cols-2">
            {uncountedCompanies.map((company) => (
              <button key={company.id} type="button" onClick={() => onSelect(company)} className="rounded-md border border-yellow-200 bg-yellow-50/50 p-3 text-left hover:bg-yellow-50">
                <div className="font-medium text-ink">{company.name}</div>
                <div className="mt-1 text-xs text-muted">申込書回収日: {company.applicationReceivedDate ?? "-"} / 契約開始日: {company.contractStartDate ?? "-"}</div>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <SidePanel title="月次計画を編集" open={isPlanPanelOpen} onClose={() => setIsPlanPanelOpen(false)}>
        {editingPlan ? <BusinessPlanForm plan={editingPlan} data={data} setData={setData} afterSave={afterSave} onDone={() => setIsPlanPanelOpen(false)} /> : null}
      </SidePanel>
    </div>
  );
}

function WorkerView({
  data,
  setData,
  afterSave,
  onSelectCompany
}: {
  data: KpiData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  onSelectCompany: (company: Company) => void;
}) {
  const [isFunnelPanelOpen, setIsFunnelPanelOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [workerDrilldown, setWorkerDrilldown] = useState<ExecutiveCard | null>(null);
  const latestFunnels = getLatestFunnels(data.funnels);
  const inflowData = getInflowSourceData(latestFunnels);
  const workerTotals = getWorkerFunnelTotals(latestFunnels);
  const weekly = getWeeklyWorkerComparison(data);
  const workerRows = (value: (funnel: Funnel) => number, suffix: string): DrilldownRow[] => latestFunnels.map((funnel) => ({
    label: getCompanyName(data, funnel.companyId),
    value: `${num(value(funnel))}${suffix}`,
    meta: `${funnel.recordedAt} / 応募 ${num(funnel.applications)}人 / 勤務 ${num(funnel.shifts)}件`,
    companyId: data.companies.some((company) => company.id === funnel.companyId) ? funnel.companyId : undefined
  }));
  const inflowKeyMap = Object.fromEntries(inflowSources.map((source) => [source.label, source.key])) as Record<string, InflowSourceKey>;
  const inflowCards: ExecutiveCard[] = inflowData.map((source) => {
    const key = inflowKeyMap[source.name];
    return {
      label: source.name,
      value: `${num(source.value)}件`,
      sub: `応募転換 ${pct(source.conversionRate)}`,
      tone: source.conversionRate >= 0.12 ? "good" : "neutral",
      change: weekly.inflow[source.name],
      formula: `企業別最新ファネルの${source.name}合計`,
      rows: workerRows((funnel) => Number(funnel[key] ?? 0), "件")
    };
  });
  const funnelCards: ExecutiveCard[] = [
    { label: "応募", value: `${num(workerTotals.applications)}人`, sub: "Worker Funnel", change: weekly.applications, formula: "企業別最新ファネルの応募数合計", rows: workerRows((funnel) => funnel.applications, "人") },
    { label: "タイミー勤務", value: `${num(workerTotals.shifts)}件`, sub: "職場体験実施", change: weekly.shifts, formula: "企業別最新ファネルのタイミー勤務数合計", rows: workerRows((funnel) => funnel.shifts, "件") },
    { label: "面談希望", value: `${num(workerTotals.interviewRequests)}件`, sub: "勤務後の意思表示", change: weekly.interviewRequests, formula: "企業別最新ファネルの面談希望数合計", rows: workerRows((funnel) => funnel.interviewRequests, "件") },
    { label: "内定", value: `${num(workerTotals.offers)}人`, sub: "選考通過", change: weekly.offers, formula: "企業別最新ファネルの内定数合計", rows: workerRows((funnel) => funnel.offers, "人") },
    { label: "入社", value: `${num(workerTotals.joins)}人`, sub: "入社承諾", change: weekly.joins, formula: "企業別最新ファネルの入社数合計", rows: workerRows((funnel) => funnel.joins, "人") }
  ];
  const companyCompare = data.companies.map((company) => {
    const funnel = latestFunnels.find((item) => item.companyId === company.id);
    return {
      name: company.name,
      応募: funnel?.applications ?? 0,
      面談化率: funnel ? rate(funnel.interviewRequests, funnel.shifts) : 0,
      前月比: funnel ? rate(funnel.applications - funnel.previousMonthApplications, Math.max(1, funnel.previousMonthApplications)) : 0
    };
  });
  const trend = [...data.funnels]
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((funnel) => {
      const company = data.companies.find((item) => item.id === funnel.companyId);
      return {
        date: `${funnel.recordedAt} ${company?.name ?? ""}`.trim(),
        応募: funnel.applications,
        勤務: funnel.shifts,
        面談希望: funnel.interviewRequests,
        内定: funnel.offers,
        入社: funnel.joins
      };
    });

  async function deleteFunnel(id: string) {
    if (isSupabaseConfigured) {
      await deleteFunnelRecord(id);
    }
    setData((current) => ({ ...current, funnels: current.funnels.filter((funnel) => funnel.id !== id) }));
    setEditingFunnel((current) => (current?.id === id ? null : current));
    afterSave("ファネルを削除しました");
  }

  function editFunnel(funnel: Funnel) {
    setEditingFunnel(funnel);
    setIsFunnelPanelOpen(true);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Worker Funnel"
        description="流入施策から入社までの遷移と、体験による行動変容を企業別・業界別に比較します。"
        action={<button onClick={() => { setEditingFunnel(null); setIsFunnelPanelOpen(true); }} className="inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-accent px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-accent-strong"><Plus className="size-4" />ファネルを入力</button>}
      />
      <FunnelDeleteList companies={data.companies} funnels={data.funnels} onEdit={editFunnel} onDelete={deleteFunnel} />
      <div className="grid gap-3 md:grid-cols-3">
        {inflowCards.map((card) => (
          <button key={card.label} type="button" onClick={() => setWorkerDrilldown(card)} className="text-left">
            <MetricCard label={card.label} value={card.value} sub={card.sub} tone={card.tone ?? "neutral"} change={card.change} />
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {funnelCards.map((card) => (
          <button key={card.label} type="button" onClick={() => setWorkerDrilldown(card)} className="text-left">
            <MetricCard label={card.label} value={card.value} sub={card.sub} tone={card.tone ?? "neutral"} change={card.change} />
          </button>
        ))}
      </div>
      <Card><div className="mb-4 text-sm font-semibold">流入ファネル</div><SimpleBarChart data={inflowData} xKey="name" bars={[{ key: "value", name: "流入数", color: "#f8c900" }, { key: "applications", name: "応募数", color: "#168a5f" }]} /></Card>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card><div className="mb-4 text-sm font-semibold">行動ファネル</div><FunnelChart data={getFunnelStages(latestFunnels)} /></Card>
        <Card><div className="mb-4 text-sm font-semibold">企業別比較</div><SimpleBarChart data={companyCompare} xKey="name" bars={[{ key: "応募", name: "応募", color: "#f8c900" }, { key: "面談化率", name: "面談化率", color: "#168a5f" }]} /></Card>
      </div>
      <Card><div className="mb-4 text-sm font-semibold">ファネル推移</div><SimpleBarChart data={trend} xKey="date" bars={[{ key: "応募", name: "応募", color: "#f8c900" }, { key: "勤務", name: "勤務", color: "#168a5f" }, { key: "内定", name: "内定", color: "#c78100" }]} /></Card>
      <Card><div className="mb-4 text-sm font-semibold">業界別比較</div><SimpleBarChart data={getIndustryFunnelData(data)} xKey="industry" bars={[{ key: "repeatRate", name: "再勤務率", color: "#f8c900" }, { key: "interviewRate", name: "面談化率", color: "#168a5f" }, { key: "offerRate", name: "内定率", color: "#c78100" }]} /></Card>
      {workerDrilldown ? (
        <ExecutiveDrilldownModal
          card={workerDrilldown}
          companies={data.companies}
          onSelectCompany={(company) => {
            setWorkerDrilldown(null);
            onSelectCompany(company);
          }}
          onClose={() => setWorkerDrilldown(null)}
        />
      ) : null}
      <SidePanel title={editingFunnel ? "ファネルを編集" : "ファネルを入力"} open={isFunnelPanelOpen} onClose={() => { setIsFunnelPanelOpen(false); setEditingFunnel(null); }}>
        <FunnelForm
          companies={data.companies}
          editingFunnel={editingFunnel}
          setEditingFunnel={setEditingFunnel}
          setData={setData}
          afterSave={afterSave}
          onDone={() => {
            setIsFunnelPanelOpen(false);
            setEditingFunnel(null);
          }}
        />
      </SidePanel>
    </div>
  );
}

function HiringView({ data }: { data: KpiData }) {
  const segmentData = data.surveys.map((survey) => ({
    segment: survey.workerSegment.split("・")[0],
    screeningIntent: survey.screeningIntent,
    offer: survey.offer ? 100 : 0
  }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Hiring Analytics" description="内定率・入社率・属性別成果・リピート勤務と内定の相関を確認します。" />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="内定率" value={pct(rate(sum(data.funnels, (f) => f.offers), sum(data.funnels, (f) => f.screenings)))} sub="内定 / 選考参加" tone="good" />
        <MetricCard label="入社率" value={pct(rate(sum(data.funnels, (f) => f.joins), sum(data.funnels, (f) => f.offers)))} sub="入社 / 内定" />
        <MetricCard label="リピート勤務者内定率" value={pct(rate(data.surveys.filter((s) => s.repeatShiftCount >= 2 && s.offer).length, data.surveys.filter((s) => s.repeatShiftCount >= 2).length))} sub="アンケートサンプル" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><div className="mb-4 text-sm font-semibold">企業別成果</div><SimpleBarChart data={getCompanyOutcomeData(data)} xKey="name" bars={[{ key: "offers", name: "内定", color: "#168a5f" }, { key: "joins", name: "入社", color: "#c78100" }]} /></Card>
        <Card><div className="mb-4 text-sm font-semibold">業界別成果</div><SimpleBarChart data={getIndustryFunnelData(data)} xKey="industry" bars={[{ key: "offerRate", name: "内定率", color: "#f8c900" }]} /></Card>
        <Card><div className="mb-4 text-sm font-semibold">ワーカー属性別成果</div><SimpleBarChart data={segmentData} xKey="segment" bars={[{ key: "screeningIntent", name: "選考参加意向", color: "#f8c900" }, { key: "offer", name: "内定", color: "#168a5f" }]} /></Card>
      </div>
    </div>
  );
}

function UnitView({
  data,
  setData,
  afterSave
}: {
  data: KpiData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
}) {
  const [isCostPanelOpen, setIsCostPanelOpen] = useState(false);
  const ltv = getLtvCac(data);
  const cohort = data.unitEconomics.map((item) => ({ cohort: item.cohort, 継続社数: item.retainedCompanies, 導入社数: item.cohortCompanies, 継続率: rate(item.retainedCompanies, item.cohortCompanies) }));
  const current = data.unitEconomics[data.unitEconomics.length - 1];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Unit Economics"
        description="MRR、成功報酬、営業/CS工数、運用費を接続し、採算が合うかを検証します。"
        action={<button onClick={() => setIsCostPanelOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-yellow-300 bg-accent px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-accent-strong"><Plus className="size-4" />運用コストを編集</button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {getUnitRows(data).map((row) => <MetricCard key={row.label} label={row.label} value={row.value} sub={row.sub} tone={row.label.includes("LTV") || row.label.includes("粗利") ? "good" : "neutral"} />)}
      </div>
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="対象月" value={current?.month ?? "-"} />
          <Info label="月間運用コスト" value={yen(current?.operatingCost ?? 0)} />
          <Info label="内訳メモ" value="人件費・運用・ツール" />
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card><div className="mb-4 text-sm font-semibold">粗利推移</div><GrossProfitChart data={displayKpiSnapshots} /></Card>
        <Card><div className="mb-4 text-sm font-semibold">コホート分析</div><SimpleBarChart data={cohort} xKey="cohort" bars={[{ key: "導入社数", name: "導入社数", color: "#f8c900" }, { key: "継続社数", name: "継続社数", color: "#168a5f" }]} /></Card>
      </div>
      <Card><div className="grid gap-4 md:grid-cols-3"><MetricCard label="LTV/CAC" value={`${ltv.ratio.toFixed(1)}x`} sub={`${yen(ltv.ltv)} / ${yen(ltv.cac)}`} tone="good" /><MetricCard label="回収期間" value={`${ltv.paybackMonths.toFixed(1)}ヶ月`} sub="CAC / 月次粗利" /><MetricCard label="成立ライン" value="3.0x以上" sub="PoC目安" /></div></Card>
      <SidePanel title="月間運用コストを編集" open={isCostPanelOpen} onClose={() => setIsCostPanelOpen(false)}>
        <UnitCostForm data={data} setData={setData} afterSave={afterSave} onDone={() => setIsCostPanelOpen(false)} />
      </SidePanel>
    </div>
  );
}

function ExperimentView({ experiments }: { experiments: Experiment[] }) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Experiment Log" description="仮説、結果、学び、次アクションをタイムラインで管理します。" />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card><div className="mb-4 text-sm font-semibold">ステータス別</div><SimpleBarChart data={experimentStatuses.map((status) => ({ status, count: experiments.filter((experiment) => experiment.status === status).length }))} xKey="status" bars={[{ key: "count", name: "件数", color: "#f8c900" }]} /></Card>
        <Card>
          <div className="space-y-5">
            {experiments.map((experiment) => (
              <div key={experiment.id} className="relative border-l border-line pl-5">
                <div className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-accent" />
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{experiment.hypothesis}</h3>
                  <Pill className={experiment.status === "成功" ? "border-green-200 bg-green-50 text-green-700" : experiment.status === "失敗" ? "border-red-200 bg-red-50 text-red-700" : "border-yellow-200 bg-yellow-50 text-yellow-800"}>{experiment.status}</Pill>
                </div>
                <p className="mt-1 text-xs text-muted">{experiment.period}</p>
                <p className="mt-2 text-sm text-ink">{experiment.detail}</p>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-3"><Info label="結果" value={experiment.result} /><Info label="学び" value={experiment.learning} /><Info label="次アクション" value={experiment.nextAction} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function UnitCostForm({
  data,
  setData,
  afterSave,
  onDone
}: {
  data: KpiData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  onDone: () => void;
}) {
  const current = data.unitEconomics[data.unitEconomics.length - 1];
  const [form, setForm] = useState({
    month: current?.month ?? new Date().toISOString().slice(0, 7),
    operatingCost: String(current?.operatingCost ?? 0)
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const existing = data.unitEconomics.find((item) => item.month === form.month);
    const nextItem: UnitEconomics = {
      month: form.month,
      operatingCost: toNumber(form.operatingCost),
      grossMarginRate: existing?.grossMarginRate ?? current?.grossMarginRate ?? 0.71,
      cohort: existing?.cohort ?? current?.cohort ?? form.month,
      cohortCompanies: existing?.cohortCompanies ?? current?.cohortCompanies ?? 0,
      retainedCompanies: existing?.retainedCompanies ?? current?.retainedCompanies ?? 0
    };
    if (isSupabaseConfigured) {
      await upsertUnitEconomics(nextItem);
    }
    setData((state) => ({
      ...state,
      unitEconomics: [
        ...state.unitEconomics.filter((item) => item.month !== form.month),
        nextItem
      ].sort((a, b) => a.month.localeCompare(b.month))
    }));
    afterSave("月間運用コストを保存しました");
    onDone();
  }

  return (
    <Card>
      <FormTitle title="月間運用コスト" />
      <form onSubmit={submit} className="mt-4 space-y-5">
        <FormSection title="対象月">
          <Input label="月" type="month" value={form.month} onChange={(month) => setForm({ ...form, month })} required />
          <Input label="月間運用コスト" type="number" value={form.operatingCost} onChange={(operatingCost) => setForm({ ...form, operatingCost })} required />
          <ReadOnlyField label="反映先" value="Executive粗利 / Unit Economics" />
        </FormSection>
        <Info label="内訳" value="人件費・運用・ツールを合算した月次固定/準固定費として入力してください。" />
        <SubmitButton label="運用コストを保存" />
      </form>
    </Card>
  );
}

function BusinessPlanForm({
  plan,
  data,
  setData,
  afterSave,
  onDone
}: {
  plan: BusinessPlan;
  data: KpiData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  onDone: () => void;
}) {
  const existing = data.businessPlans?.find((item) => item.month === plan.month);
  const [form, setForm] = useState({
    month: plan.month,
    targetCompanies: String(plan.targetCompanies),
    memo: plan.memo
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const sameMonthExisting = data.businessPlans?.find((item) => item.month === form.month);
    const nextPlan: BusinessPlan = {
      id: sameMonthExisting?.id ?? existing?.id ?? plan.id,
      month: form.month,
      targetCompanies: toNumber(form.targetCompanies),
      memo: form.memo
    };
    if (isSupabaseConfigured) {
      try {
        await upsertBusinessPlan(nextPlan);
      } catch {
        afterSave("月次計画の保存に失敗しました。DBにBusiness Planテーブルを追加してください");
        return;
      }
    }
    setData((state) => ({
      ...state,
      businessPlans: [
        ...state.businessPlans.filter((item) => item.month !== nextPlan.month && item.id !== nextPlan.id),
        nextPlan
      ].sort((a, b) => a.month.localeCompare(b.month))
    }));
    afterSave("月次計画を保存しました");
    onDone();
  }

  return (
    <Card>
      <FormTitle title="月次導入計画" />
      <form onSubmit={submit} className="mt-4 space-y-5">
        <FormSection title="計画値">
          <Input label="対象月" type="month" value={form.month} onChange={(month) => setForm({ ...form, month })} required />
          <Input label="導入社数目標" type="number" value={form.targetCompanies} onChange={(targetCompanies) => setForm({ ...form, targetCompanies })} required />
          <ReadOnlyField label="実績条件" value="P7 + 必要日付あり" />
          <Textarea label="メモ" value={form.memo} onChange={(memo) => setForm({ ...form, memo })} className="lg:col-span-3" />
        </FormSection>
        <Info label="集計ルール" value="実績は申込書回収ベース/契約開始ベースを画面上で切替できます。Pipelineヨミは契約予定日ベースで積み上げます。" />
        <SubmitButton label="月次計画を保存" />
      </form>
    </Card>
  );
}

function BusinessPlanDeleteButton({ plan, onDelete }: { plan: BusinessPlan; onDelete: (plan: BusinessPlan) => void }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsConfirmOpen(true)} className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 px-2.5 text-xs font-medium text-danger hover:bg-red-50">削除</button>
      {isConfirmOpen ? (
        <ConfirmDialog
          title="本当に削除しますか？"
          description={`${plan.month} の月次計画を削除します。この操作は取り消せません。`}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            onDelete(plan);
          }}
        />
      ) : null}
    </>
  );
}

function SurveyView({ data }: { data: KpiData }) {
  const summary = getSurveySummary(data);
  return (
    <div className="space-y-6">
      <SectionHeader title="Student Surveys" description="志望度Before/After、企業理解度、社員理解度、再勤務意向、選考参加意向を管理します。" />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="企業理解度" value={summary.avgUnderstanding.toFixed(1)} sub="100点満点" />
        <MetricCard label="再勤務意向" value={summary.repeatIntent.toFixed(1)} sub="100点満点" />
        <MetricCard label="選考参加意向" value={summary.screeningIntent.toFixed(1)} sub="100点満点" />
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-line bg-panel text-xs text-muted"><tr>{["企業", "属性", "Before", "After", "企業理解", "社員理解", "再勤務", "選考参加", "コメント"].map((head) => <th key={head} className="px-4 py-3 font-medium">{head}</th>)}</tr></thead>
            <tbody>
              {data.surveys.map((survey) => {
                const company = data.companies.find((item) => item.id === survey.companyId);
                return (
                  <tr key={survey.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium">{company?.name}</td>
                    <td className="px-4 py-3 text-muted">{survey.workerSegment}</td>
                    <td className="px-4 py-3">{survey.desireBefore}</td>
                    <td className="px-4 py-3 font-semibold text-success">{survey.desireAfter}</td>
                    <td className="px-4 py-3">{survey.companyUnderstanding}</td>
                    <td className="px-4 py-3">{survey.employeeUnderstanding}</td>
                    <td className="px-4 py-3">{survey.repeatIntent}</td>
                    <td className="px-4 py-3">{survey.screeningIntent}</td>
                    <td className="px-4 py-3 text-muted">{survey.comment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DataEntryView({ data, setData, setSavedMessage }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; setSavedMessage: (message: string) => void }) {
  const [tab, setTab] = useState<"company" | "funnel">("company");
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);

  function afterSave(message: string) {
    const updatedAt = new Date();
    setSavedMessage(`${message} / 最終更新 ${formatUpdatedAt(updatedAt)}`);
    window.setTimeout(() => setSavedMessage(getPersistenceMessage(updatedAt)), 2200);
  }

  function deleteCompany(id: string) {
    setData((current) => ({
      ...current,
      companies: current.companies.filter((company) => company.id !== id),
      funnels: current.funnels.filter((funnel) => funnel.companyId !== id),
      surveys: current.surveys.filter((survey) => survey.companyId !== id)
    }));
    afterSave("企業を削除しました");
  }

  function deleteFunnel(id: string) {
    setData((current) => ({ ...current, funnels: current.funnels.filter((funnel) => funnel.id !== id) }));
    setEditingFunnel((current) => (current?.id === id ? null : current));
    afterSave("ファネルを削除しました");
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Data Entry" description="PoCの新しい営業データとワーカー行動を入力します。保存後は全ダッシュボードへ即反映されます。" />
      <div className="flex flex-wrap gap-2">
        {[["company", "企業"], ["funnel", "ファネル"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as typeof tab)} className={cn("rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-muted", tab === id && "border-yellow-300 bg-accent text-ink")}>{label}</button>
        ))}
      </div>
      {tab === "company" && (
        <>
          <CompanyForm setData={setData} afterSave={afterSave} />
          <CompanyDeleteList companies={data.companies} onDelete={deleteCompany} />
        </>
      )}
      {tab === "funnel" && (
        <>
          <FunnelForm companies={data.companies} editingFunnel={editingFunnel} setEditingFunnel={setEditingFunnel} setData={setData} afterSave={afterSave} />
          <FunnelDeleteList companies={data.companies} funnels={data.funnels} onEdit={setEditingFunnel} onDelete={deleteFunnel} />
        </>
      )}
    </div>
  );
}

function CompanyForm({ setData, afterSave, onDone, title = "企業を追加" }: { setData: React.Dispatch<React.SetStateAction<AppData>>; afterSave: (message: string) => void; onDone?: () => void; title?: string }) {
  const [form, setForm] = useState({
    name: "", industry: "", area: "関東", owner: "", status: "リード" as CompanyStatus, clientPhase: "P0" as ClientPhase, forecastRating: "-" as ForecastRating, expectedMrr: "200000", contractMonths: "12", successFee: "400000", expectedHires: "3",
    naScheduledDate: "", dealMemo: "", initialMeetingDate: "", applicationReceivedDate: "", proposalDate: "", contractTargetDate: "", contractStartDate: "", lostReason: "", memo: "", salesHours: "0", csHours: "0"
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const company: Company = {
      id: crypto.randomUUID(),
      name: form.name,
      industry: form.industry,
      area: form.area,
      owner: form.owner,
      email: "",
      status: form.clientPhase === "失注" ? "失注" : form.status,
      clientPhase: form.clientPhase,
      forecastRating: form.forecastRating,
      naScheduledDate: emptyToNull(form.naScheduledDate),
      dealMemo: form.dealMemo,
      expectedMrr: toNumber(form.expectedMrr),
      contractMonths: toNumber(form.contractMonths),
      successFee: toNumber(form.successFee),
      expectedHires: toNumber(form.expectedHires),
      initialMeetingDate: emptyToNull(form.initialMeetingDate),
      applicationReceivedDate: emptyToNull(form.applicationReceivedDate),
      proposalDate: emptyToNull(form.proposalDate),
      contractTargetDate: emptyToNull(form.contractTargetDate),
      contractStartDate: emptyToNull(form.contractStartDate),
      lostReason: emptyToNull(form.lostReason),
      memo: form.memo,
      salesHours: toNumber(form.salesHours),
      csHours: toNumber(form.csHours),
      acquisitionCost: 0
    };
    let clientPipelinePersisted = true;
    if (isSupabaseConfigured) {
      try {
        const result = await upsertCompany(company);
        if (result?.clientPipelinePersisted === false) {
          clientPipelinePersisted = false;
        }
      } catch (error) {
        afterSave(getCompanyDbSaveErrorMessage(error, "企業の保存に失敗しました"));
        return;
      }
    }
    setData((current) => ({ ...current, companies: [company, ...current.companies] }));
    setForm({ ...form, name: "", owner: "", memo: "", dealMemo: "", lostReason: "" });
    afterSave(getCompanySaveMessage("企業を追加しました", clientPipelinePersisted));
    onDone?.();
  }

  return (
    <Card>
      <FormTitle title={title} />
      <form onSubmit={submit} className="mt-4 space-y-5">
        <FormSection title="基本情報">
          <Input label="企業名" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <Input label="業界" value={form.industry} onChange={(industry) => setForm({ ...form, industry })} required />
          <Select label="所在地エリア" value={form.area} options={areas} onChange={(area) => setForm({ ...form, area })} />
          <Input label="担当者名" value={form.owner} onChange={(owner) => setForm({ ...form, owner })} required />
          <Select label="FCSTステータス" value={form.status} options={statuses} onChange={(status) => setForm({ ...form, status: status as CompanyStatus })} />
          <Select label="商談フェーズ" value={form.clientPhase} options={clientPhases.map((phase) => ({ value: phase, label: formatClientPhaseOption(phase) }))} onChange={(clientPhase) => setForm({ ...form, clientPhase: clientPhase as ClientPhase, status: clientPhase === "失注" ? "失注" : form.status })} />
          <Select label="受注ヨミ" value={form.forecastRating} options={forecastRatings} onChange={(forecastRating) => setForm({ ...form, forecastRating: forecastRating as ForecastRating })} />
        </FormSection>
        <FormSection title="Client Pipeline">
          <Input label="NA予定日" type="date" value={form.naScheduledDate} onChange={(naScheduledDate) => setForm({ ...form, naScheduledDate })} />
          <Textarea label="商談メモ" value={form.dealMemo} onChange={(dealMemo) => setForm({ ...form, dealMemo })} className="lg:col-span-2" />
        </FormSection>
        <FormSection title="FCST条件">
          <Input label="想定MRR" type="number" value={form.expectedMrr} onChange={(expectedMrr) => setForm({ ...form, expectedMrr })} />
          <Input label="契約期間（月）" type="number" value={form.contractMonths} onChange={(contractMonths) => setForm({ ...form, contractMonths })} />
          <ReadOnlyField label="ARR見込み" value={yen(toNumber(form.expectedMrr) * toNumber(form.contractMonths))} />
          <Input label="想定成功報酬単価" type="number" value={form.successFee} onChange={(successFee) => setForm({ ...form, successFee })} />
          <Input label="想定採用人数" type="number" value={form.expectedHires} onChange={(expectedHires) => setForm({ ...form, expectedHires })} />
        </FormSection>
        <FormSection title="日付・運用">
          <Input label="初回商談日" type="date" value={form.initialMeetingDate} onChange={(initialMeetingDate) => setForm({ ...form, initialMeetingDate })} />
          <Input label="提案日" type="date" value={form.proposalDate} onChange={(proposalDate) => setForm({ ...form, proposalDate })} />
          <Input label="申込回収予定日" type="date" value={form.applicationReceivedDate} onChange={(applicationReceivedDate) => setForm({ ...form, applicationReceivedDate })} />
          <Input label="契約予定日" type="date" value={form.contractTargetDate} onChange={(contractTargetDate) => setForm({ ...form, contractTargetDate })} />
          <Input label="契約開始日" type="date" value={form.contractStartDate} onChange={(contractStartDate) => setForm({ ...form, contractStartDate })} />
          <Input label="営業工数" type="number" value={form.salesHours} onChange={(salesHours) => setForm({ ...form, salesHours })} />
          <Input label="CS工数" type="number" value={form.csHours} onChange={(csHours) => setForm({ ...form, csHours })} />
          <Input label="失注理由" value={form.lostReason} onChange={(lostReason) => setForm({ ...form, lostReason })} required={form.clientPhase === "失注"} />
          <Textarea label="メモ" value={form.memo} onChange={(memo) => setForm({ ...form, memo })} className="lg:col-span-3" />
        </FormSection>
        <SubmitButton label="企業を保存" />
      </form>
    </Card>
  );
}

function FunnelForm({
  companies,
  editingFunnel,
  setEditingFunnel,
  setData,
  afterSave,
  onDone
}: {
  companies: Company[];
  editingFunnel: Funnel | null;
  setEditingFunnel: (funnel: Funnel | null) => void;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  onDone?: () => void;
}) {
  type SourceFunnelForm = Record<InflowSourceKey, Record<"inflow" | typeof funnelStageKeys[number], string>>;
  const [form, setForm] = useState({
    companyId: companies[0]?.id ?? "",
    recordedAt: new Date().toISOString().slice(0, 10),
    previousMonthApplications: "0"
  });
  const [activeSource, setActiveSource] = useState<InflowSourceKey>("brazeDeliveries");
  const [sourceForm, setSourceForm] = useState<SourceFunnelForm>(() => sourceFunnelsToForm());

  useEffect(() => {
    if (!editingFunnel) return;
    setForm({
      companyId: editingFunnel.companyId,
      recordedAt: editingFunnel.recordedAt,
      previousMonthApplications: String(editingFunnel.previousMonthApplications)
    });
    setSourceForm(sourceFunnelsToForm(editingFunnel));
  }, [editingFunnel]);

  function updateSourceField(source: InflowSourceKey, key: "inflow" | typeof funnelStageKeys[number], value: string) {
    setSourceForm((current) => ({ ...current, [source]: { ...current[source], [key]: value } }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const sourceFunnels = sourceFormToFunnels(sourceForm);
    const totals = getSourceFunnelTotals(sourceFunnels);
    const funnel: Funnel = {
      id: editingFunnel?.id ?? crypto.randomUUID(),
      companyId: form.companyId,
      recordedAt: form.recordedAt,
      brazeDeliveries: sourceFunnels.brazeDeliveries?.inflow ?? 0,
      calls: sourceFunnels.calls?.inflow ?? 0,
      surveyInterviews: sourceFunnels.surveyInterviews?.inflow ?? 0,
      overviewRecommendations: sourceFunnels.overviewRecommendations?.inflow ?? 0,
      sourceFunnels,
      views: totals.views,
      applications: totals.applications,
      shifts: totals.shifts,
      repeatShifts: totals.repeatShifts,
      interviewRequests: totals.interviewRequests,
      screenings: totals.screenings,
      offers: totals.offers,
      joins: totals.joins,
      previousMonthApplications: toNumber(form.previousMonthApplications)
    };
    if (isSupabaseConfigured) {
      await upsertFunnel(funnel);
    }
    setData((current) => ({
      ...current,
      funnels: editingFunnel ? current.funnels.map((item) => (item.id === funnel.id ? funnel : item)) : [funnel, ...current.funnels]
    }));
    setEditingFunnel(null);
    afterSave(editingFunnel ? "ファネルを編集しました" : "ファネルを追加しました");
    onDone?.();
  }

  return (
    <Card>
      <FormTitle title={editingFunnel ? "ワーカーファネルを編集" : "ワーカーファネルを追加"} />
      {companies.length === 0 ? <EmptyState message="先に企業を追加してください。" /> : null}
      <form onSubmit={submit} className="mt-4 space-y-5">
        <FormSection title="対象">
          <Select label="企業" value={form.companyId} options={companies.map((company) => ({ label: company.name, value: company.id }))} onChange={(companyId) => setForm({ ...form, companyId })} />
          <Input label="記録日" type="date" value={form.recordedAt} onChange={(recordedAt) => setForm({ ...form, recordedAt })} required />
          <Input label="前月応募" type="number" value={form.previousMonthApplications} onChange={(previousMonthApplications) => setForm({ ...form, previousMonthApplications })} />
        </FormSection>
        <div className="rounded-lg border border-line bg-white p-3">
          <div className="text-sm font-semibold text-ink">流入元別ファネル</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {inflowSources.map((source) => {
              const item = sourceForm[source.key];
              return (
                <button
                  key={source.key}
                  type="button"
                  onClick={() => setActiveSource(source.key)}
                  className={cn("rounded-md border p-3 text-left transition", activeSource === source.key ? "border-yellow-300 bg-yellow-50 shadow-soft" : "border-line bg-panel hover:bg-yellow-50/60")}
                >
                  <div className="text-xs font-semibold text-ink">{source.label}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                    <span>流入 {num(toNumber(item.inflow))}</span>
                    <span>応募 {num(toNumber(item.applications))}</span>
                    <span>勤務 {num(toNumber(item.shifts))}</span>
                    <span>内定 {num(toNumber(item.offers))}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-md border border-line bg-white p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-ink">{inflowSources.find((source) => source.key === activeSource)?.label} の行動ファネル</div>
              <Pill className="border-yellow-200 bg-yellow-50 text-muted">流入元を切替</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="流入数" type="number" value={sourceForm[activeSource].inflow} onChange={(value) => updateSourceField(activeSource, "inflow", value)} />
              {funnelStageKeys.map((key) => (
                <Input key={key} label={funnelLabels[key]} type="number" value={sourceForm[activeSource][key]} onChange={(value) => updateSourceField(activeSource, key, value)} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 lg:col-span-full">
          <SubmitButton label={editingFunnel ? "変更を保存" : "ファネルを保存"} disabled={companies.length === 0} />
          {editingFunnel ? <button type="button" onClick={() => { setEditingFunnel(null); onDone?.(); }} className="h-10 rounded-md border border-line px-4 text-sm font-medium text-muted hover:bg-panel">キャンセル</button> : null}
        </div>
      </form>
    </Card>
  );
}

function SurveyForm({ companies, setData, afterSave }: { companies: Company[]; setData: React.Dispatch<React.SetStateAction<AppData>>; afterSave: (message: string) => void }) {
  const [form, setForm] = useState({ companyId: companies[0]?.id ?? "", workerSegment: "", desireBefore: "50", desireAfter: "75", companyUnderstanding: "75", employeeUnderstanding: "75", repeatIntent: "75", screeningIntent: "65", comment: "", repeatShiftCount: "1", offer: "false", join: "false" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const survey: Survey = {
      id: crypto.randomUUID(),
      companyId: form.companyId,
      workerSegment: form.workerSegment,
      desireBefore: toNumber(form.desireBefore),
      desireAfter: toNumber(form.desireAfter),
      companyUnderstanding: toNumber(form.companyUnderstanding),
      employeeUnderstanding: toNumber(form.employeeUnderstanding),
      repeatIntent: toNumber(form.repeatIntent),
      screeningIntent: toNumber(form.screeningIntent),
      comment: form.comment,
      repeatShiftCount: toNumber(form.repeatShiftCount),
      offer: form.offer === "true",
      join: form.join === "true"
    };
    if (isSupabaseConfigured) {
      await upsertSurvey(survey);
    }
    setData((current) => ({ ...current, surveys: [survey, ...current.surveys] }));
    setForm({ ...form, workerSegment: "", comment: "" });
    afterSave("アンケートを追加しました");
  }

  return (
    <Card>
      <FormTitle title="学生アンケートを追加" />
      {companies.length === 0 ? <EmptyState message="先に企業を追加してください。" /> : null}
      <form onSubmit={submit} className="mt-4 grid gap-4 lg:grid-cols-3">
        <Select label="企業" value={form.companyId} options={companies.map((company) => ({ label: company.name, value: company.id }))} onChange={(companyId) => setForm({ ...form, companyId })} />
        <Input label="属性" value={form.workerSegment} onChange={(workerSegment) => setForm({ ...form, workerSegment })} required />
        <Input label="リピート勤務回数" type="number" value={form.repeatShiftCount} onChange={(repeatShiftCount) => setForm({ ...form, repeatShiftCount })} />
        {(["desireBefore", "desireAfter", "companyUnderstanding", "employeeUnderstanding", "repeatIntent", "screeningIntent"] as const).map((key) => (
          <Input key={key} label={surveyLabels[key]} type="number" value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} />
        ))}
        <Select label="内定" value={form.offer} options={[{ label: "なし", value: "false" }, { label: "あり", value: "true" }]} onChange={(offer) => setForm({ ...form, offer })} />
        <Select label="入社予定" value={form.join} options={[{ label: "なし", value: "false" }, { label: "あり", value: "true" }]} onChange={(join) => setForm({ ...form, join })} />
        <Textarea label="コメント" value={form.comment} onChange={(comment) => setForm({ ...form, comment })} className="lg:col-span-3" />
        <SubmitButton label="アンケートを保存" disabled={companies.length === 0} />
      </form>
    </Card>
  );
}

function ExperimentForm({ setData, afterSave }: { setData: React.Dispatch<React.SetStateAction<AppData>>; afterSave: (message: string) => void }) {
  const [form, setForm] = useState({ hypothesis: "", detail: "", period: "", status: "未実施" as ExperimentStatus, result: "", learning: "", nextAction: "" });

  function submit(event: FormEvent) {
    event.preventDefault();
    const experiment: Experiment = { id: crypto.randomUUID(), ...form };
    setData((current) => ({ ...current, experiments: [experiment, ...current.experiments] }));
    setForm({ hypothesis: "", detail: "", period: "", status: "未実施", result: "", learning: "", nextAction: "" });
    afterSave("実験ログを追加しました");
  }

  return (
    <Card>
      <FormTitle title="仮説検証ログを追加" />
      <form onSubmit={submit} className="mt-4 grid gap-4 lg:grid-cols-2">
        <Input label="仮説" value={form.hypothesis} onChange={(hypothesis) => setForm({ ...form, hypothesis })} required />
        <Select label="ステータス" value={form.status} options={experimentStatuses} onChange={(status) => setForm({ ...form, status: status as ExperimentStatus })} />
        <Input label="実施期間" value={form.period} onChange={(period) => setForm({ ...form, period })} placeholder="2026/05/21 - 2026/06/10" />
        <Input label="結果" value={form.result} onChange={(result) => setForm({ ...form, result })} />
        <Textarea label="内容" value={form.detail} onChange={(detail) => setForm({ ...form, detail })} className="lg:col-span-2" />
        <Textarea label="学び" value={form.learning} onChange={(learning) => setForm({ ...form, learning })} />
        <Textarea label="次アクション" value={form.nextAction} onChange={(nextAction) => setForm({ ...form, nextAction })} />
        <SubmitButton label="実験ログを保存" />
      </form>
    </Card>
  );
}

function CompanyDeleteList({ companies, onDelete }: { companies: Company[]; onDelete: (id: string) => void }) {
  return (
    <Card>
      <FormTitle title="登録済み企業" />
      <div className="mt-4 space-y-2">
        {companies.length === 0 ? <EmptyState message="企業データはありません。" /> : null}
        {companies.map((company) => (
          <DeleteRow key={company.id} title={company.name} meta={`${company.industry} / ${company.area} / ${company.status} / ${yen(company.expectedMrr)}`} onDelete={() => onDelete(company.id)} />
        ))}
      </div>
    </Card>
  );
}

function FunnelDeleteList({ companies, funnels, onEdit, onDelete }: { companies: Company[]; funnels: Funnel[]; onEdit: (funnel: Funnel) => void; onDelete: (id: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const sortedFunnels = [...funnels].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const visibleFunnels = showAll ? sortedFunnels : sortedFunnels.slice(0, 3);
  const hiddenCount = Math.max(0, sortedFunnels.length - 3);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FormTitle title="登録済みファネル" />
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex h-8 items-center rounded-md border border-line px-3 text-xs font-medium text-muted hover:bg-panel"
          >
            {showAll ? "最新3件だけ表示" : `すべて表示（+${hiddenCount}件）`}
          </button>
        ) : null}
      </div>
      <div className="mt-4 space-y-2">
        {funnels.length === 0 ? <EmptyState message="ファネルデータはありません。" /> : null}
        {visibleFunnels.map((funnel) => {
          const company = companies.find((item) => item.id === funnel.companyId);
          return (
            <DeleteRow
              key={funnel.id}
              title={`${company?.name ?? "削除済み企業"} / ${funnel.recordedAt}`}
              meta={`Braze ${num(funnel.brazeDeliveries ?? 0)} / 架電 ${num(funnel.calls ?? 0)} / アンケート・IV ${num(funnel.surveyInterviews ?? 0)} / 概要推薦 ${num(funnel.overviewRecommendations ?? 0)} / 応募 ${num(funnel.applications)} / 内定 ${num(funnel.offers)}`}
              onEdit={() => onEdit(funnel)}
              onDelete={() => onDelete(funnel.id)}
            />
          );
        })}
      </div>
    </Card>
  );
}

function SurveyDeleteList({ companies, surveys, onDelete }: { companies: Company[]; surveys: Survey[]; onDelete: (id: string) => void }) {
  return (
    <Card>
      <FormTitle title="登録済みアンケート" />
      <div className="mt-4 space-y-2">
        {surveys.length === 0 ? <EmptyState message="アンケートデータはありません。" /> : null}
        {surveys.map((survey) => {
          const company = companies.find((item) => item.id === survey.companyId);
          return (
            <DeleteRow
              key={survey.id}
              title={`${company?.name ?? "削除済み企業"} / ${survey.workerSegment}`}
              meta={`志望度 ${survey.desireBefore} -> ${survey.desireAfter} / 再勤務意向 ${survey.repeatIntent} / 選考参加意向 ${survey.screeningIntent}`}
              onDelete={() => onDelete(survey.id)}
            />
          );
        })}
      </div>
    </Card>
  );
}

function ExperimentDeleteList({ experiments, onDelete }: { experiments: Experiment[]; onDelete: (id: string) => void }) {
  return (
    <Card>
      <FormTitle title="登録済み実験ログ" />
      <div className="mt-4 space-y-2">
        {experiments.length === 0 ? <EmptyState message="実験ログはありません。" /> : null}
        {experiments.map((experiment) => (
          <DeleteRow key={experiment.id} title={experiment.hypothesis} meta={`${experiment.status} / ${experiment.period || "期間未設定"}`} onDelete={() => onDelete(experiment.id)} />
        ))}
      </div>
    </Card>
  );
}

function DeleteRow({ title, meta, onDelete, onEdit }: { title: string; meta: string; onDelete: () => void; onEdit?: () => void }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-md border border-line bg-white p-3 transition hover:border-yellow-300 hover:bg-yellow-50/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-ink">{title}</div>
          <div className="mt-1 text-xs text-muted">{meta}</div>
        </div>
        <div className="flex gap-2">
          {onEdit ? <button type="button" onClick={onEdit} className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-muted hover:bg-yellow-50 hover:text-ink">編集</button> : null}
          <button type="button" onClick={() => setIsConfirmOpen(true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-medium text-danger hover:bg-red-50">
            <Trash2 className="size-4" />
            削除
          </button>
        </div>
      </div>
      {isConfirmOpen ? (
        <ConfirmDialog
          title="本当に削除しますか？"
          description={`${title} を削除します。この操作は取り消せません。`}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            onDelete();
          }}
        />
      ) : null}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">{message}</div>;
}

function ConfirmDialog({ title, description, onCancel, onConfirm }: { title: string; description: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-2xl">
        <div className="text-base font-semibold text-ink">{title}</div>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-muted hover:bg-panel">キャンセル</button>
          <button type="button" onClick={onConfirm} className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-danger hover:bg-red-100">削除する</button>
        </div>
      </div>
    </div>
  );
}

function ExecutiveDrilldownModal({
  card,
  companies,
  onSelectCompany,
  onClose
}: {
  card: ExecutiveCard;
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onClose: () => void;
}) {
  function selectCompany(companyId?: string) {
    if (!companyId) return;
    const company = companies.find((item) => item.id === companyId);
    if (company) onSelectCompany(company);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-line bg-white p-5">
          <div>
            <div className="text-xs font-semibold text-muted">参照データ</div>
            <h3 className="mt-1 text-lg font-semibold text-ink">{card.label}</h3>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-md border border-line hover:bg-panel" title="閉じる">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label={card.label} value={card.value} sub={card.sub} tone={card.tone ?? "neutral"} />
            <Info label="計算ロジック" value={card.formula} />
          </div>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-line bg-yellow-50 px-4 py-3 text-xs font-semibold text-muted">対象一覧</div>
            <div className="divide-y divide-line">
              {card.rows.length === 0 ? <div className="p-4 text-sm text-muted">対象データはありません。</div> : null}
              {card.rows.map((row, index) => (
                <button
                  key={`${row.label}-${index}`}
                  type="button"
                  onClick={() => selectCompany(row.companyId)}
                  disabled={!row.companyId}
                  className={cn(
                    "grid w-full gap-2 px-4 py-3 text-left text-sm sm:grid-cols-[1fr_auto] sm:items-center",
                    row.companyId ? "transition hover:bg-yellow-50" : "cursor-default"
                  )}
                >
                  <div className="min-w-0">
                    <div className={cn("truncate font-medium text-ink", row.companyId && "underline-offset-4 hover:underline")}>{row.label}</div>
                    {row.meta ? <div className="mt-1 text-xs text-muted">{row.meta}</div> : null}
                  </div>
                  <div className="font-semibold text-ink">{row.value}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <button type="button" aria-label="閉じる" className="hidden flex-1 sm:block" onClick={onClose} />
      <aside className="h-full w-full overflow-y-auto border-l border-line bg-white shadow-2xl sm:max-w-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-ink">{title}</div>
            <div className="mt-1 text-xs text-muted">保存すると各ダッシュボードへすぐ反映されます</div>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-md border border-line hover:bg-panel" title="閉じる">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}

function CompanyModal({
  data,
  company,
  setData,
  afterSave,
  onCompanyChange,
  onClose
}: {
  data: KpiData;
  company: Company;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  afterSave: (message: string) => void;
  onCompanyChange: (company: Company | null) => void;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    name: company.name,
    industry: company.industry,
    area: company.area,
    owner: company.owner,
    email: company.email,
    status: company.status,
    clientPhase: getClientPhase(company),
    forecastRating: getForecastRating(company),
    naScheduledDate: company.naScheduledDate ?? "",
    dealMemo: company.dealMemo ?? "",
    expectedMrr: String(company.expectedMrr),
    contractMonths: String(company.contractMonths ?? 0),
    successFee: String(company.successFee),
    expectedHires: String(company.expectedHires),
    initialMeetingDate: company.initialMeetingDate ?? "",
    applicationReceivedDate: company.applicationReceivedDate ?? "",
    proposalDate: company.proposalDate ?? "",
    contractTargetDate: company.contractTargetDate ?? "",
    contractStartDate: company.contractStartDate ?? "",
    lostReason: company.lostReason ?? "",
    memo: company.memo,
    salesHours: String(company.salesHours),
    csHours: String(company.csHours)
  });
  const funnel = data.funnels.find((item) => item.companyId === company.id);

  async function saveCompany(event: FormEvent) {
    event.preventDefault();
    const updated: Company = {
      ...company,
      name: form.name,
      industry: form.industry,
      area: form.area,
      owner: form.owner,
      email: form.email,
      status: form.clientPhase === "失注" ? "失注" : form.status,
      clientPhase: form.clientPhase,
      forecastRating: form.forecastRating,
      naScheduledDate: emptyToNull(form.naScheduledDate),
      dealMemo: form.dealMemo,
      expectedMrr: toNumber(form.expectedMrr),
      contractMonths: toNumber(form.contractMonths),
      successFee: toNumber(form.successFee),
      expectedHires: toNumber(form.expectedHires),
      initialMeetingDate: emptyToNull(form.initialMeetingDate),
      applicationReceivedDate: emptyToNull(form.applicationReceivedDate),
      proposalDate: emptyToNull(form.proposalDate),
      contractTargetDate: emptyToNull(form.contractTargetDate),
      contractStartDate: emptyToNull(form.contractStartDate),
      lostReason: emptyToNull(form.lostReason),
      memo: form.memo,
      salesHours: toNumber(form.salesHours),
      csHours: toNumber(form.csHours)
    };
    let clientPipelinePersisted = true;
    if (isSupabaseConfigured) {
      try {
        const result = await upsertCompany(updated);
        if (result?.clientPipelinePersisted === false) {
          clientPipelinePersisted = false;
        }
      } catch (error) {
        afterSave(getCompanyDbSaveErrorMessage(error, "企業データの保存に失敗しました"));
        return;
      }
    }
    setData((current) => ({ ...current, companies: current.companies.map((item) => (item.id === updated.id ? updated : item)) }));
    onCompanyChange(updated);
    setIsEditing(false);
    afterSave(getCompanySaveMessage("企業データを更新しました", clientPipelinePersisted));
  }

  async function deleteCompany() {
    if (isSupabaseConfigured) {
      await deleteCompanyRecord(company.id);
    }
    setData((current) => ({
      ...current,
      companies: current.companies.filter((item) => item.id !== company.id),
      funnels: current.funnels.filter((item) => item.companyId !== company.id),
      surveys: current.surveys.filter((item) => item.companyId !== company.id)
    }));
    onCompanyChange(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-line bg-white p-5">
          <div><h2 className="text-lg font-semibold">{company.name}</h2><p className="mt-1 text-sm text-muted">{company.industry} / {company.area} / {company.owner}</p></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing((value) => !value)} className="inline-flex h-8 items-center gap-2 rounded-md border border-line px-3 text-xs font-medium text-muted hover:bg-panel">
              {isEditing ? "表示に戻る" : "編集"}
            </button>
            <button onClick={() => setIsDeleteConfirmOpen(true)} className="inline-flex h-8 items-center gap-2 rounded-md border border-red-200 px-3 text-xs font-medium text-danger hover:bg-red-50">
              <Trash2 className="size-4" />
              削除
            </button>
            <button onClick={onClose} className="grid size-8 place-items-center rounded-md border border-line hover:bg-panel" title="閉じる"><X className="size-4" /></button>
          </div>
        </div>
        <div className="space-y-5 p-5">
          {isEditing ? (
            <Card>
              <FormTitle title="企業データを編集" />
              <form onSubmit={saveCompany} className="mt-4 space-y-5">
                <FormSection title="基本情報">
                  <Input label="企業名" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
                  <Input label="業界" value={form.industry} onChange={(industry) => setForm({ ...form, industry })} required />
                  <Select label="所在地エリア" value={form.area} options={areas} onChange={(area) => setForm({ ...form, area })} />
                  <Input label="担当者名" value={form.owner} onChange={(owner) => setForm({ ...form, owner })} required />
                  <Select label="FCSTステータス" value={form.status} options={statuses} onChange={(status) => setForm({ ...form, status: status as CompanyStatus })} />
                  <Select label="商談フェーズ" value={form.clientPhase} options={clientPhases.map((phase) => ({ value: phase, label: formatClientPhaseOption(phase) }))} onChange={(clientPhase) => setForm({ ...form, clientPhase: clientPhase as ClientPhase, status: clientPhase === "失注" ? "失注" : form.status })} />
                  <Select label="受注ヨミ" value={form.forecastRating} options={forecastRatings} onChange={(forecastRating) => setForm({ ...form, forecastRating: forecastRating as ForecastRating })} />
                </FormSection>
                <FormSection title="Client Pipeline">
                  <Input label="NA予定日" type="date" value={form.naScheduledDate} onChange={(naScheduledDate) => setForm({ ...form, naScheduledDate })} />
                  <Textarea label="商談メモ" value={form.dealMemo} onChange={(dealMemo) => setForm({ ...form, dealMemo })} className="lg:col-span-2" />
                </FormSection>
                <FormSection title="FCST条件">
                  <Input label="想定MRR" type="number" value={form.expectedMrr} onChange={(expectedMrr) => setForm({ ...form, expectedMrr })} />
                  <Input label="契約期間（月）" type="number" value={form.contractMonths} onChange={(contractMonths) => setForm({ ...form, contractMonths })} />
                  <ReadOnlyField label="ARR見込み" value={yen(toNumber(form.expectedMrr) * toNumber(form.contractMonths))} />
                  <Input label="想定成功報酬単価" type="number" value={form.successFee} onChange={(successFee) => setForm({ ...form, successFee })} />
                  <Input label="想定採用人数" type="number" value={form.expectedHires} onChange={(expectedHires) => setForm({ ...form, expectedHires })} />
                </FormSection>
                <FormSection title="日付・運用">
                  <Input label="初回商談日" type="date" value={form.initialMeetingDate} onChange={(initialMeetingDate) => setForm({ ...form, initialMeetingDate })} />
                  <Input label="提案日" type="date" value={form.proposalDate} onChange={(proposalDate) => setForm({ ...form, proposalDate })} />
                  <Input label="申込回収予定日" type="date" value={form.applicationReceivedDate} onChange={(applicationReceivedDate) => setForm({ ...form, applicationReceivedDate })} />
                  <Input label="契約予定日" type="date" value={form.contractTargetDate} onChange={(contractTargetDate) => setForm({ ...form, contractTargetDate })} />
                  <Input label="契約開始日" type="date" value={form.contractStartDate} onChange={(contractStartDate) => setForm({ ...form, contractStartDate })} />
                  <Input label="営業工数" type="number" value={form.salesHours} onChange={(salesHours) => setForm({ ...form, salesHours })} />
                  <Input label="CS工数" type="number" value={form.csHours} onChange={(csHours) => setForm({ ...form, csHours })} />
                  <Input label="失注理由" value={form.lostReason} onChange={(lostReason) => setForm({ ...form, lostReason })} required={form.clientPhase === "失注"} />
                  <Textarea label="メモ" value={form.memo} onChange={(memo) => setForm({ ...form, memo })} className="lg:col-span-3" />
                </FormSection>
                <SubmitButton label="変更を保存" />
              </form>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3"><MetricCard label="ARR見込み" value={yen(getArrForecast(company))} /><MetricCard label="契約期間" value={`${company.contractMonths ?? 0}ヶ月`} /><MetricCard label="想定MRR" value={yen(company.expectedMrr)} /><MetricCard label="成功報酬単価" value={yen(company.successFee)} /></div>
              <div className="grid gap-3 sm:grid-cols-2"><Info label="所在地エリア" value={company.area} /><Info label="FCSTステータス" value={company.status} /><Info label="商談フェーズ" value={formatClientPhaseOption(getClientPhase(company))} /><Info label="受注ヨミ" value={getForecastRating(company)} /><Info label="NA予定日" value={company.naScheduledDate ?? "-"} /><Info label="商談メモ" value={company.dealMemo || "-"} /><Info label="初回商談日" value={company.initialMeetingDate ?? "-"} /><Info label="提案日" value={company.proposalDate ?? "-"} /><Info label="申込回収予定日" value={company.applicationReceivedDate ?? "-"} /><Info label="受注リードタイム" value={getLeadTimeDays(company) === null ? "-" : `${num(getLeadTimeDays(company) ?? 0)}日`} /><Info label="契約予定日" value={company.contractTargetDate ?? "-"} /><Info label="契約開始日" value={company.contractStartDate ?? "-"} /><Info label="失注理由" value={company.lostReason ?? "-"} /><Info label="メモ" value={company.memo} /></div>
            </>
          )}
          {funnel ? <Card><div className="mb-4 text-sm font-semibold">企業別ワーカーファネル</div><FunnelChart data={getFunnelStages([funnel])} /></Card> : null}
        </div>
      </div>
      {isDeleteConfirmOpen ? (
        <ConfirmDialog
          title="企業を削除しますか？"
          description={`${company.name} を削除します。この企業に紐づくファネルやアンケートも削除されます。`}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={deleteCompany}
        />
      ) : null}
    </div>
  );
}

const funnelLabels = {
  brazeDeliveries: "Braze配信",
  calls: "架電",
  surveyInterviews: "アンケート/IV",
  overviewRecommendations: "概要推薦",
  views: "閲覧",
  applications: "応募",
  shifts: "タイミー勤務",
  repeatShifts: "リピート勤務",
  interviewRequests: "面談希望",
  screenings: "選考参加",
  offers: "内定",
  joins: "入社",
  previousMonthApplications: "前月応募"
};

function emptySourceFunnel(): InflowSourceFunnel {
  return { inflow: 0, views: 0, applications: 0, shifts: 0, repeatShifts: 0, interviewRequests: 0, screenings: 0, offers: 0, joins: 0 };
}

function sourceFunnelsToForm(funnel?: Funnel): Record<InflowSourceKey, Record<"inflow" | typeof funnelStageKeys[number], string>> {
  const sourceFunnels = getNormalizedSourceFunnels(funnel);
  return Object.fromEntries(inflowSources.map((source) => {
    const item = sourceFunnels[source.key] ?? emptySourceFunnel();
    return [source.key, Object.fromEntries((["inflow", ...funnelStageKeys] as const).map((key) => [key, String(item[key] ?? 0)]))];
  })) as Record<InflowSourceKey, Record<"inflow" | typeof funnelStageKeys[number], string>>;
}

function sourceFormToFunnels(sourceForm: Record<InflowSourceKey, Record<"inflow" | typeof funnelStageKeys[number], string>>): Record<InflowSourceKey, InflowSourceFunnel> {
  return Object.fromEntries(inflowSources.map((source) => {
    const item = sourceForm[source.key];
    return [source.key, {
      inflow: toNumber(item.inflow),
      views: toNumber(item.views),
      applications: toNumber(item.applications),
      shifts: toNumber(item.shifts),
      repeatShifts: toNumber(item.repeatShifts),
      interviewRequests: toNumber(item.interviewRequests),
      screenings: toNumber(item.screenings),
      offers: toNumber(item.offers),
      joins: toNumber(item.joins)
    }];
  })) as Record<InflowSourceKey, InflowSourceFunnel>;
}

function getNormalizedSourceFunnels(funnel?: Funnel): Record<InflowSourceKey, InflowSourceFunnel> {
  if (!funnel) {
    return Object.fromEntries(inflowSources.map((source) => [source.key, emptySourceFunnel()])) as Record<InflowSourceKey, InflowSourceFunnel>;
  }
  const existing = funnel.sourceFunnels;
  if (existing && inflowSources.some((source) => existing[source.key])) {
    return Object.fromEntries(inflowSources.map((source) => {
      const item = existing[source.key] ?? emptySourceFunnel();
      return [source.key, { ...emptySourceFunnel(), ...item, inflow: item.inflow ?? Number(funnel[source.key] ?? 0) }];
    })) as Record<InflowSourceKey, InflowSourceFunnel>;
  }

  const inflowValues = Object.fromEntries(inflowSources.map((source) => [source.key, Number(funnel[source.key] ?? 0)])) as Record<InflowSourceKey, number>;
  const totalInflow = sum(Object.values(inflowValues), (value) => value);
  return Object.fromEntries(inflowSources.map((source) => {
    const share = totalInflow > 0 ? inflowValues[source.key] / totalInflow : source.key === "brazeDeliveries" ? 1 : 0;
    return [source.key, {
      inflow: inflowValues[source.key],
      views: Math.round(funnel.views * share),
      applications: Math.round(funnel.applications * share),
      shifts: Math.round(funnel.shifts * share),
      repeatShifts: Math.round(funnel.repeatShifts * share),
      interviewRequests: Math.round(funnel.interviewRequests * share),
      screenings: Math.round(funnel.screenings * share),
      offers: Math.round(funnel.offers * share),
      joins: Math.round(funnel.joins * share)
    }];
  })) as Record<InflowSourceKey, InflowSourceFunnel>;
}

function getSourceFunnelTotals(sourceFunnels: Record<InflowSourceKey, InflowSourceFunnel>) {
  return Object.fromEntries(funnelStageKeys.map((key) => [key, sum(Object.values(sourceFunnels), (source) => source[key])])) as Record<typeof funnelStageKeys[number], number>;
}

function normalizeFunnel(funnel: Funnel): Funnel {
  const sourceFunnels = getNormalizedSourceFunnels(funnel);
  const totals = getSourceFunnelTotals(sourceFunnels);
  return {
    ...funnel,
    brazeDeliveries: sourceFunnels.brazeDeliveries.inflow,
    calls: sourceFunnels.calls.inflow,
    surveyInterviews: sourceFunnels.surveyInterviews.inflow,
    overviewRecommendations: sourceFunnels.overviewRecommendations.inflow,
    sourceFunnels,
    ...totals
  };
}

const surveyLabels = {
  desireBefore: "志望度Before",
  desireAfter: "志望度After",
  companyUnderstanding: "企業理解度",
  employeeUnderstanding: "社員理解度",
  repeatIntent: "再勤務意向",
  screeningIntent: "選考参加意向"
};

function FormTitle({ title }: { title: string }) {
  return <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Save className="size-4" />{title}</div>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-yellow-200 bg-yellow-50/30 p-4">
      <legend className="px-1 text-xs font-semibold text-muted">{title}</legend>
      <div className="mt-2 grid gap-4 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="mt-1 flex h-10 items-center rounded-md border border-yellow-200 bg-yellow-50 px-3 text-sm font-semibold text-ink">
        {value}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-yellow-100" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<string | { label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-yellow-100">
        {options.map((option) => {
          const item = typeof option === "string" ? { label: option, value: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-yellow-100" />
    </label>
  );
}

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return <button type="submit" disabled={disabled} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-yellow-300 bg-accent px-4 text-sm font-semibold text-ink shadow-sm hover:bg-accent-strong disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-200 disabled:text-muted lg:col-span-full"><Save className="size-4" />{label}</button>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-line bg-panel p-3"><div className="text-xs font-medium text-muted">{label}</div><div className="mt-1 text-sm leading-6 text-ink">{value}</div></div>;
}

function ValueSignal({ label, value, score }: { label: string; value: string; score: number }) {
  return <div><div className="flex items-center justify-between text-sm"><span className="font-medium">{label}</span><span className="text-muted">{value}</span></div><ProgressBar value={score} className="mt-2" /></div>;
}

function getArrForecast(company: Company) {
  return company.expectedMrr * (company.contractMonths ?? 0);
}

function getClientPhase(company: Company): ClientPhase {
  if (company.clientPhase) return company.clientPhase;
  if (company.status === "失注") return "失注";
  if (company.status === "受注") return "P7";
  if (company.status === "契約交渉") return "P6";
  if (company.status === "PoC") return "P3";
  if (company.status === "提案中") return "P2";
  if (company.status === "初回商談") return "P1";
  return "P0";
}

function getForecastRating(company: Company): ForecastRating {
  return company.forecastRating ?? "-";
}

function getCompanySaveMessage(base: string, clientPipelinePersisted: boolean) {
  if (!clientPipelinePersisted) return `${base}。DBにClientカラムを追加してください`;
  return base;
}

function getCompanyDbSaveErrorMessage(error: unknown, base: string) {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "";
  if (["forecast_rating", "companies_forecast_rating_check"].some((keyword) => message.includes(keyword))) {
    return `${base}。DBの受注ヨミ設定を更新してください`;
  }
  return `${base}。DB保存設定を確認してください`;
}

function formatClientPhaseOption(phase: ClientPhase) {
  return phase === "失注" ? "失注" : `${phase} ${clientPhaseLabels[phase]}`;
}

function ForecastPill({ rating }: { rating: ForecastRating }) {
  return <Pill className={forecastStyle[rating]}>{rating}</Pill>;
}

function normalizeAppData(data: AppData): AppData {
  return {
    ...data,
    businessPlans: [...(data.businessPlans ?? seedBusinessPlans)].sort((a, b) => a.month.localeCompare(b.month)),
    companies: data.companies.map((company) => ({
      ...company,
      clientPhase: getClientPhase(company),
      forecastRating: getForecastRating(company),
      initialMeetingDate: company.initialMeetingDate ?? company.proposalDate ?? null,
      applicationReceivedDate: company.applicationReceivedDate ?? company.contractTargetDate ?? null
    })),
    funnels: data.funnels.map(normalizeFunnel)
  };
}

function getDefaultBusinessPlanMonth(data: KpiData) {
  return data.businessPlans?.[0]?.month ?? data.companies.find((company) => company.contractTargetDate)?.contractTargetDate?.slice(0, 7) ?? formatLocalDate(new Date()).slice(0, 7);
}

function getFiscalYearStart(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const fiscalYear = monthNumber >= 4 ? year : year - 1;
  return `${fiscalYear}-04`;
}

function getFiscalYearEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const fiscalYear = monthNumber >= 4 ? year + 1 : year;
  return `${fiscalYear}-03`;
}

function getBusinessPlanPeriodMonths(mode: BusinessPlanPeriodMode, selectedMonth: string, startMonth: string, endMonth: string) {
  if (mode === "single") return [selectedMonth];
  return getMonthRange(startMonth, endMonth);
}

function getMonthRange(startMonth: string, endMonth: string) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const start = new Date(startYear, startMonthNumber - 1, 1);
  const end = new Date(endYear, endMonthNumber - 1, 1);
  if (start > end) return [startMonth];
  const months: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && months.length < 36) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function getFilledBusinessPlanRows(data: KpiData, basis: BusinessPlanCountingBasis, months: string[]) {
  const rowByMonth = new Map(getBusinessPlanRows(data, basis).map((row) => [row.month, row]));
  return months.map((month) => rowByMonth.get(month) ?? createEmptyBusinessPlanRow(month));
}

function createEmptyBusinessPlanRow(month: string): BusinessPlanRow {
  return {
    month,
    plan: undefined,
    targetCompanies: 0,
    actualCompanies: 0,
    actualCompanyIds: [],
    pipelineStar3: 0,
    pipelineStar2: 0,
    pipelineStar1: 0,
    pipelineUnset: 0,
    conservative: 0,
    standard: 0,
    upside: 0,
    gap: 0,
    standardGap: 0,
    achievementRate: 0,
    uncountedP7: 0,
    uncountedP7CompanyIds: []
  };
}

function getBusinessPlanSummary(rows: BusinessPlanRow[]) {
  return {
    target: sum(rows, (row) => row.targetCompanies),
    actual: sum(rows, (row) => row.actualCompanies),
    star3: sum(rows, (row) => row.pipelineStar3),
    star2: sum(rows, (row) => row.pipelineStar2),
    star1: sum(rows, (row) => row.pipelineStar1),
    unset: sum(rows, (row) => row.pipelineUnset),
    standard: sum(rows, (row) => row.standard),
    uncountedP7: sum(rows, (row) => row.uncountedP7)
  };
}

function getBusinessPlanCumulativeRows(rows: BusinessPlanRow[]) {
  let cumulativeTarget = 0;
  let cumulativeActual = 0;
  let cumulativeStandard = 0;
  return rows.map((row) => {
    cumulativeTarget += row.targetCompanies;
    cumulativeActual += row.actualCompanies;
    cumulativeStandard += row.standard;
    return {
      month: row.month,
      cumulativeTarget,
      cumulativeActual,
      cumulativeStandard
    };
  });
}

function formatMonthRangeLabel(months: string[]) {
  if (months.length === 0) return "-";
  if (months.length === 1) return months[0];
  return `${months[0]} - ${months[months.length - 1]}`;
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${num(value)}`;
  if (value < 0) return `-${num(Math.abs(value))}`;
  return "±0";
}

function getExecutiveTrendData(data: KpiData) {
  const months = new Set<string>();
  data.funnels.forEach((funnel) => months.add(funnel.recordedAt.slice(0, 7)));
  data.companies.forEach((company) => {
    [company.initialMeetingDate, company.proposalDate, company.applicationReceivedDate, company.contractStartDate].forEach((date) => {
      if (date) months.add(date.slice(0, 7));
    });
  });
  data.unitEconomics.forEach((item) => months.add(item.month.slice(0, 7)));
  if (months.size === 0) months.add(formatLocalDate(new Date()).slice(0, 7));

  return [...months].sort().map((month) => {
    const cutoff = getMonthEnd(month);
    const monthData = getDataAsOf(data, cutoff);
    const kpis = getExecutiveKpis(monthData, cutoff);
    const arrForecastCompanies = monthData.companies.filter((company) => hasRecognizedRevenue(company, cutoff) && getArrForecast(company) > 0);

    return {
      month,
      offers: kpis.offers,
      joins: kpis.joins,
      mrr: kpis.mrr,
      arrForecast: sum(arrForecastCompanies, getArrForecast)
    };
  });
}

function getMonthEnd(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return formatLocalDate(new Date(year, monthIndex, 0));
}

function getWeeklyExecutiveComparison(data: KpiData): Record<string, MetricChange> {
  const previousCutoff = getPreviousMonday();
  const previousData = getDataAsOf(data, previousCutoff);
  const current = getExecutiveKpis(data);
  const previous = getExecutiveKpis(previousData, previousCutoff);
  const currentWon = data.companies.filter((company) => company.status === "受注");
  const previousWon = previousData.companies.filter((company) => company.status === "受注");
  const currentContracted = data.companies.filter((company) => hasRecognizedRevenue(company));
  const previousContracted = previousData.companies.filter((company) => hasRecognizedRevenue(company, previousCutoff));
  const currentLeadTime = getAverageLeadTime(currentWon);
  const previousLeadTime = getAverageLeadTime(previousWon);
  const currentArpu = Math.round(current.mrr / Math.max(1, currentContracted.length));
  const previousArpu = Math.round(previous.mrr / Math.max(1, previousContracted.length));
  const currentArrForecast = sum(currentContracted, getArrForecast);
  const previousArrForecast = sum(previousContracted, getArrForecast);

  return {
    introduced: makeMetricChange(current.introduced, previous.introduced, "社"),
    proposals: makeMetricChange(current.proposals, previous.proposals, "社"),
    meetingRate: makeMetricChange(current.meetingRate, previous.meetingRate, "pt", true),
    winRate: makeMetricChange(current.winRate, previous.winRate, "pt", true),
    leadTime: makeMetricChange(currentLeadTime, previousLeadTime, "日"),
    mrr: makeMetricChange(current.mrr, previous.mrr, "円"),
    arrForecast: makeMetricChange(currentArrForecast, previousArrForecast, "円"),
    arpu: makeMetricChange(currentArpu, previousArpu, "円"),
    successFees: makeMetricChange(current.successFees, previous.successFees, "円"),
    referrals: makeMetricChange(current.referrals, previous.referrals, "人"),
    shifts: makeMetricChange(current.shifts, previous.shifts, "件"),
    interviews: makeMetricChange(current.interviews, previous.interviews, "件"),
    offers: makeMetricChange(current.offers, previous.offers, "人"),
    joins: makeMetricChange(current.joins, previous.joins, "人"),
    grossProfitPerCompany: makeMetricChange(current.grossProfitPerCompany, previous.grossProfitPerCompany, "円"),
    progress: makeMetricChange(current.progress, previous.progress, "pt", true)
  };
}

function getWeeklySalesComparison(data: KpiData): Record<string, MetricChange> {
  const previousCutoff = getPreviousMonday();
  const previousData = getDataAsOf(data, previousCutoff);
  const currentTotals = getPipelineTotals(data);
  const previousTotals = getPipelineTotals(previousData, previousCutoff);
  const currentKpis = getExecutiveKpis(data);
  const previousKpis = getExecutiveKpis(previousData, previousCutoff);
  const currentArrCompanies = data.companies.filter((company) => hasRecognizedRevenue(company) && getArrForecast(company) > 0);
  const previousArrCompanies = previousData.companies.filter((company) => hasRecognizedRevenue(company, previousCutoff) && getArrForecast(company) > 0);

  return {
    expectedMrr: makeMetricChange(currentTotals.expectedMrr, previousTotals.expectedMrr, "円"),
    contractedMrr: makeMetricChange(currentTotals.contractedMrr, previousTotals.contractedMrr, "円"),
    expectedSuccessFee: makeMetricChange(currentTotals.expectedSuccessFee, previousTotals.expectedSuccessFee, "円"),
    arrForecast: makeMetricChange(sum(currentArrCompanies, getArrForecast), sum(previousArrCompanies, getArrForecast), "円"),
    arrForecastCompanies: makeMetricChange(currentArrCompanies.length, previousArrCompanies.length, "件"),
    winRate: makeMetricChange(currentKpis.winRate, previousKpis.winRate, "pt", true)
  };
}

function getWeeklyWorkerComparison(data: KpiData): {
  inflow: Record<string, MetricChange>;
  applications: MetricChange;
  shifts: MetricChange;
  interviewRequests: MetricChange;
  offers: MetricChange;
  joins: MetricChange;
} {
  const previousData = getDataAsOf(data, getPreviousMonday());
  const currentFunnels = getLatestFunnels(data.funnels);
  const previousFunnels = getLatestFunnels(previousData.funnels);
  const currentTotals = getWorkerFunnelTotals(currentFunnels);
  const previousTotals = getWorkerFunnelTotals(previousFunnels);
  const previousInflowByName = Object.fromEntries(getInflowSourceData(previousFunnels).map((source) => [source.name, source.value]));
  const currentInflow = getInflowSourceData(currentFunnels);

  return {
    inflow: Object.fromEntries(currentInflow.map((source) => [source.name, makePositiveOnlyMetricChange(source.value, previousInflowByName[source.name] ?? 0, "件")])),
    applications: makePositiveOnlyMetricChange(currentTotals.applications, previousTotals.applications, "人"),
    shifts: makePositiveOnlyMetricChange(currentTotals.shifts, previousTotals.shifts, "件"),
    interviewRequests: makePositiveOnlyMetricChange(currentTotals.interviewRequests, previousTotals.interviewRequests, "件"),
    offers: makePositiveOnlyMetricChange(currentTotals.offers, previousTotals.offers, "人"),
    joins: makePositiveOnlyMetricChange(currentTotals.joins, previousTotals.joins, "人")
  };
}

function getWorkerFunnelTotals(funnels: Funnel[]) {
  return {
    applications: sum(funnels, (funnel) => funnel.applications),
    shifts: sum(funnels, (funnel) => funnel.shifts),
    interviewRequests: sum(funnels, (funnel) => funnel.interviewRequests),
    offers: sum(funnels, (funnel) => funnel.offers),
    joins: sum(funnels, (funnel) => funnel.joins)
  };
}

function getDataAsOf(data: KpiData, cutoff: string): KpiData {
  const companies = data.companies
    .filter((company) => {
      const firstDate = company.initialMeetingDate ?? company.proposalDate ?? company.contractStartDate ?? company.applicationReceivedDate;
      return !firstDate || firstDate <= cutoff;
    })
    .map((company) => getCompanyAsOf(company, cutoff));
  const companyIds = new Set(companies.map((company) => company.id));

  return {
    companies,
    funnels: getLatestFunnels(data.funnels.filter((funnel) => companyIds.has(funnel.companyId) && funnel.recordedAt <= cutoff)),
    surveys: data.surveys.filter((survey) => companyIds.has(survey.companyId)),
    unitEconomics: data.unitEconomics.filter((item) => `${item.month}-01`.slice(0, 10) <= cutoff),
    businessPlans: data.businessPlans?.filter((item) => `${item.month}-01`.slice(0, 10) <= cutoff) ?? []
  };
}

function getCompanyAsOf(company: Company, cutoff: string): Company {
  const asOfCompany = company.applicationReceivedDate && company.applicationReceivedDate > cutoff && company.clientPhase === "P7"
    ? { ...company, clientPhase: "P6" as ClientPhase }
    : company;
  const wonDate = asOfCompany.applicationReceivedDate ?? asOfCompany.contractStartDate ?? asOfCompany.contractTargetDate;
  if (asOfCompany.status === "受注" && wonDate && wonDate <= cutoff) return asOfCompany;
  if (asOfCompany.status === "失注") return asOfCompany;
  if (asOfCompany.proposalDate && asOfCompany.proposalDate <= cutoff) return { ...asOfCompany, status: "提案中" };
  if (asOfCompany.initialMeetingDate && asOfCompany.initialMeetingDate <= cutoff) return { ...asOfCompany, status: "初回商談" };
  return { ...asOfCompany, status: "リード" };
}

function getPreviousMonday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const daysSinceMonday = (day + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday - 7);
  return formatLocalDate(date);
}

function makeMetricChange(current: number, previous: number, unit: string, isRate = false): MetricChange {
  const diff = current - previous;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const sign = diff > 0 ? "+" : diff < 0 ? "-" : "±";
  const amountValue = isRate ? `${Math.abs(Math.round(diff * 10) / 10)}${unit}` : formatDeltaAmount(Math.abs(Math.round(diff)), unit);
  const percentValue = previous === 0 ? (diff === 0 ? "0%" : `${diff > 0 ? "+" : "-"}100%`) : `${sign}${Math.abs(Math.round((diff / previous) * 1000) / 10)}%`;
  return {
    amount: `${sign}${amountValue}`,
    percent: percentValue,
    direction
  };
}

function makePositiveOnlyMetricChange(current: number, previous: number, unit: string): MetricChange {
  return current <= previous ? { amount: `±${formatDeltaAmount(0, unit)}`, percent: "0%", direction: "flat" } : makeMetricChange(current, previous, unit);
}

function formatDeltaAmount(value: number, unit: string) {
  if (unit === "円") return yen(value);
  return `${num(value)}${unit}`;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAverageLeadTime(companies: Company[]) {
  const leadTimeCompanies = companies.filter((company) => getLeadTimeDays(company) !== null);
  return Math.round(sum(leadTimeCompanies, (company) => getLeadTimeDays(company) ?? 0) / Math.max(1, leadTimeCompanies.length));
}

function getLeadTimeDays(company: Company) {
  if (!company.initialMeetingDate || !company.applicationReceivedDate) return null;
  const start = new Date(`${company.initialMeetingDate}T00:00:00`);
  const end = new Date(`${company.applicationReceivedDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function getCompanyName(data: KpiData, companyId: string) {
  return data.companies.find((company) => company.id === companyId)?.name ?? "削除済み企業";
}

function getInflowSourceData(funnels: Funnel[]) {
  const totalApplications = sum(funnels, (funnel) => funnel.applications);
  const sources = inflowSources.map((source) => ({
    name: source.label,
    value: sum(funnels, (funnel) => funnel[source.key] ?? 0),
    applications: sum(funnels, (funnel) => getNormalizedSourceFunnels(funnel)[source.key]?.applications ?? 0)
  }));
  const totalInflow = sum(sources, (source) => source.value);

  return sources.map((source) => {
    const applications = source.applications > 0 ? source.applications : totalInflow > 0 ? Math.round(totalApplications * rate(source.value, totalInflow)) : 0;
    return { ...source, applications, conversionRate: rate(applications, source.value) };
  });
}

function toNumber(value: string) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function emptyToNull(value: string) {
  return value.trim() === "" ? null : value;
}
