import { BusinessPlan, Company, Experiment, Funnel, KpiSnapshot, Survey, UnitEconomics } from "./types";

export const companies: Company[] = [
  {
    id: "c1",
    name: "サクラフーズ",
    industry: "外食",
    area: "関東",
    owner: "高橋 美咲",
    email: "",
    status: "受注",
    clientPhase: "P7",
    forecastRating: "★★★",
    naScheduledDate: "2026-03-24",
    dealMemo: "店長面談化の再現性と初期導入店舗の選定を次回確認。",
    expectedMrr: 320000,
    contractMonths: 12,
    successFee: 450000,
    expectedHires: 4,
    initialMeetingDate: "2026-03-06",
    applicationReceivedDate: "2026-03-24",
    proposalDate: "2026-03-06",
    contractTargetDate: "2026-03-24",
    contractStartDate: "2026-04-01",
    lostReason: null,
    memo: "リピート勤務者の店長面談化に強い関心。現場理解を採用広報に転用したい。",
    salesHours: 26,
    csHours: 18,
    acquisitionCost: 210000
  }
];

export const funnels: Funnel[] = [
  {
    id: "f1",
    companyId: "c1",
    recordedAt: "2026-05-01",
    brazeDeliveries: 1200,
    calls: 80,
    surveyInterviews: 45,
    overviewRecommendations: 95,
    sourceFunnels: {
      brazeDeliveries: { inflow: 1200, views: 1210, applications: 132, shifts: 74, repeatShifts: 30, interviewRequests: 16, screenings: 12, offers: 4, joins: 2 },
      calls: { inflow: 80, views: 70, applications: 28, shifts: 18, repeatShifts: 8, interviewRequests: 5, screenings: 4, offers: 2, joins: 1 },
      surveyInterviews: { inflow: 45, views: 45, applications: 24, shifts: 15, repeatShifts: 7, interviewRequests: 6, screenings: 4, offers: 1, joins: 1 },
      overviewRecommendations: { inflow: 95, views: 95, applications: 34, shifts: 19, repeatShifts: 9, interviewRequests: 4, screenings: 2, offers: 1, joins: 1 }
    },
    views: 1420,
    applications: 218,
    shifts: 126,
    repeatShifts: 54,
    interviewRequests: 31,
    screenings: 22,
    offers: 8,
    joins: 5,
    previousMonthApplications: 172
  }
];

export const surveys: Survey[] = [
  {
    id: "s1",
    companyId: "c1",
    workerSegment: "文系・接客経験あり",
    desireBefore: 58,
    desireAfter: 82,
    companyUnderstanding: 86,
    employeeUnderstanding: 84,
    repeatIntent: 88,
    screeningIntent: 76,
    comment: "社員の雰囲気が想像より良く、店長候補の仕事が具体的に見えた。",
    repeatShiftCount: 3,
    offer: true,
    join: true
  }
];

export const kpiSnapshots: KpiSnapshot[] = [
  {
    month: "2026-05",
    companies: 1,
    proposals: 1,
    mrr: 320000,
    successFees: 2250000,
    referrals: 218,
    experienceShifts: 126,
    interviews: 31,
    offers: 8,
    joins: 5,
    grossProfit: 1420000
  }
];

export const unitEconomics: UnitEconomics[] = [
  {
    month: "2026-05",
    operatingCost: 1080000,
    grossMarginRate: 0.71,
    cohort: "May",
    cohortCompanies: 1,
    retainedCompanies: 1
  }
];

export const businessPlans: BusinessPlan[] = [
  {
    id: "bp1",
    month: "2026-04",
    targetCompanies: 1,
    memo: "PoC初月。P7かつ契約開始日ありを実績計上。"
  },
  {
    id: "bp2",
    month: "2026-05",
    targetCompanies: 3,
    memo: "導入社数の月次予実を確認。"
  },
  {
    id: "bp3",
    month: "2026-06",
    targetCompanies: 6,
    memo: "10社目標に向けた積み上げ月。"
  }
];

export const experiments: Experiment[] = [
  {
    id: "e1",
    hypothesis: "リピート勤務2回以上で面談化率が上がる",
    detail: "勤務後24時間以内に社員コメント付きの面談案内を送る。",
    period: "2026/04/01 - 2026/04/30",
    status: "成功",
    result: "面談化率が上昇",
    learning: "現場社員からの具体フィードバックが効く。",
    nextAction: "社員コメントテンプレートを業界別に作成"
  }
];
