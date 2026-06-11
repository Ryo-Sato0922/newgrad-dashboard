export type CompanyStatus = "リード" | "初回商談" | "提案中" | "PoC" | "契約交渉" | "受注" | "失注";
export type ClientPhase = "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "失注";
export type ForecastRating = "★★★" | "★★" | "★" | "-";
export type ExperimentStatus = "未実施" | "検証中" | "成功" | "失敗";

export type Company = {
  id: string;
  name: string;
  industry: string;
  area: string;
  owner: string;
  email: string;
  status: CompanyStatus;
  clientPhase?: ClientPhase;
  forecastRating?: ForecastRating;
  naScheduledDate?: string | null;
  dealMemo?: string;
  expectedMrr: number;
  contractMonths?: number;
  successFee: number;
  expectedHires: number;
  initialMeetingDate: string | null;
  applicationReceivedDate: string | null;
  proposalDate: string | null;
  contractTargetDate: string | null;
  contractStartDate: string | null;
  lostReason: string | null;
  memo: string;
  salesHours: number;
  csHours: number;
  acquisitionCost: number;
};

export type Funnel = {
  id: string;
  companyId: string;
  recordedAt: string;
  brazeDeliveries?: number;
  calls?: number;
  surveyInterviews?: number;
  overviewRecommendations?: number;
  sourceFunnels?: Partial<Record<InflowSourceKey, InflowSourceFunnel>>;
  views: number;
  applications: number;
  shifts: number;
  repeatShifts: number;
  interviewRequests: number;
  screenings: number;
  offers: number;
  joins: number;
  previousMonthApplications: number;
};

export type InflowSourceKey = "brazeDeliveries" | "calls" | "surveyInterviews" | "overviewRecommendations";

export type InflowSourceFunnel = {
  inflow: number;
  views: number;
  applications: number;
  shifts: number;
  repeatShifts: number;
  interviewRequests: number;
  screenings: number;
  offers: number;
  joins: number;
};

export type Survey = {
  id: string;
  companyId: string;
  workerSegment: string;
  desireBefore: number;
  desireAfter: number;
  companyUnderstanding: number;
  employeeUnderstanding: number;
  repeatIntent: number;
  screeningIntent: number;
  comment: string;
  repeatShiftCount: number;
  offer: boolean;
  join: boolean;
};

export type KpiSnapshot = {
  month: string;
  companies: number;
  proposals: number;
  mrr: number;
  successFees: number;
  referrals: number;
  experienceShifts: number;
  interviews: number;
  offers: number;
  joins: number;
  grossProfit: number;
};

export type UnitEconomics = {
  month: string;
  operatingCost: number;
  grossMarginRate: number;
  cohort: string;
  cohortCompanies: number;
  retainedCompanies: number;
};

export type Experiment = {
  id: string;
  hypothesis: string;
  detail: string;
  period: string;
  status: ExperimentStatus;
  result: string;
  learning: string;
  nextAction: string;
};

export type AppData = {
  companies: Company[];
  funnels: Funnel[];
  surveys: Survey[];
  unitEconomics: UnitEconomics[];
  experiments: Experiment[];
};
