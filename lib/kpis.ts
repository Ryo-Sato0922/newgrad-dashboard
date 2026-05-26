import { companies as seedCompanies, funnels as seedFunnels, kpiSnapshots, surveys as seedSurveys, unitEconomics as seedUnitEconomics } from "./data";
import { Company, Funnel, Survey, UnitEconomics } from "./types";

export type KpiData = {
  companies: Company[];
  funnels: Funnel[];
  surveys: Survey[];
  unitEconomics: UnitEconomics[];
};

const seedData: KpiData = {
  companies: seedCompanies,
  funnels: seedFunnels,
  surveys: seedSurveys,
  unitEconomics: seedUnitEconomics
};

const defaultUnitEconomics: UnitEconomics = {
  month: "2026-05",
  operatingCost: 0,
  grossMarginRate: 0.71,
  cohort: "Default",
  cohortCompanies: 0,
  retainedCompanies: 0
};

export const yen = (value: number) => new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
export const num = (value: number) => new Intl.NumberFormat("ja-JP").format(Math.round(value));
export const pct = (value: number) => `${Math.round(value * 10) / 10}%`;

export function rate(part: number, total: number) {
  return total === 0 ? 0 : (part / total) * 100;
}

export function sum<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((acc, item) => acc + selector(item), 0);
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function hasContractStarted(company: Company) {
  const today = getLocalDateKey();
  return Boolean(company.contractStartDate && company.contractStartDate <= today);
}

export function getLatestFunnels(funnels: Funnel[]) {
  return Object.values(funnels.reduce<Record<string, Funnel>>((acc, funnel) => {
    const current = acc[funnel.companyId];
    if (!current || funnel.recordedAt > current.recordedAt) {
      acc[funnel.companyId] = funnel;
    }
    return acc;
  }, {})).sort((a, b) => a.companyId.localeCompare(b.companyId));
}

export function getExecutiveKpis(data: KpiData = seedData) {
  const { companies, unitEconomics } = data;
  const funnels = getLatestFunnels(data.funnels);
  const proposals = companies.filter((company) => Boolean(company.proposalDate)).length;
  const won = companies.filter((company) => company.status === "受注");
  const contracted = companies.filter(hasContractStarted);
  const dealStage = companies.filter((company) => company.status !== "リード").length;
  const mrr = sum(contracted, (company) => company.expectedMrr);
  const successFees = sum(funnels, (funnel) => funnel.joins) * 400000;
  const referrals = sum(funnels, (funnel) => funnel.applications);
  const shifts = sum(funnels, (funnel) => funnel.shifts);
  const interviews = sum(funnels, (funnel) => funnel.interviewRequests);
  const offers = sum(funnels, (funnel) => funnel.offers);
  const joins = sum(funnels, (funnel) => funnel.joins);
  const currentUnit = unitEconomics[unitEconomics.length - 1] ?? defaultUnitEconomics;
  const grossProfit = mrr + successFees - currentUnit.operatingCost;
  const cac = Math.round(sum(companies, (company) => company.acquisitionCost) / Math.max(1, won.length));

  return {
    introduced: won.length,
    proposals,
    meetingRate: rate(dealStage, companies.length),
    winRate: rate(won.length, proposals),
    mrr,
    successFees,
    referrals,
    shifts,
    interviews,
    offers,
    joins,
    grossProfitPerCompany: Math.round(grossProfit / Math.max(1, won.length)),
    cac,
    progress: rate(won.length, 10)
  };
}

export function getPipelineTotals(data: KpiData = seedData) {
  const { companies } = data;
  const open = companies.filter((company) => !["受注", "失注"].includes(company.status));
  return {
    expectedMrr: sum(open, (company) => company.expectedMrr),
    contractedMrr: sum(companies.filter(hasContractStarted), (company) => company.expectedMrr),
    expectedSuccessFee: sum(open, (company) => company.successFee * company.expectedHires)
  };
}

export function getLostReasonData(data: KpiData = seedData) {
  const { companies } = data;
  const reasons = companies.filter((company) => company.status === "失注").reduce<Record<string, number>>((acc, company) => {
    const reason = company.lostReason ?? "不明";
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(reasons).map(([reason, count]) => ({ reason, count }));
}

export function getFunnelStages(input: Funnel[] = seedFunnels) {
  const totals = {
    views: sum(input, (funnel) => funnel.views),
    applications: sum(input, (funnel) => funnel.applications),
    shifts: sum(input, (funnel) => funnel.shifts),
    repeatShifts: sum(input, (funnel) => funnel.repeatShifts),
    interviewRequests: sum(input, (funnel) => funnel.interviewRequests),
    screenings: sum(input, (funnel) => funnel.screenings),
    offers: sum(input, (funnel) => funnel.offers),
    joins: sum(input, (funnel) => funnel.joins)
  };

  const stages = [
    ["閲覧", totals.views],
    ["応募", totals.applications],
    ["タイミー勤務", totals.shifts],
    ["リピート勤務", totals.repeatShifts],
    ["面談希望", totals.interviewRequests],
    ["選考参加", totals.screenings],
    ["内定", totals.offers],
    ["入社", totals.joins]
  ] as const;

  return stages.map(([name, value], index) => {
    const previous = index === 0 ? value : stages[index - 1][1];
    return { name, value, transitionRate: rate(value, previous), totalRate: rate(value, totals.views) };
  });
}

export function getIndustryFunnelData(data: KpiData = seedData) {
  const { companies } = data;
  const funnels = getLatestFunnels(data.funnels);
  const byIndustry = companies.reduce<Record<string, Funnel[]>>((acc, company) => {
    const funnel = funnels.find((item) => item.companyId === company.id);
    if (!funnel) return acc;
    acc[company.industry] = [...(acc[company.industry] ?? []), funnel];
    return acc;
  }, {});

  return Object.entries(byIndustry).map(([industry, items]) => ({
    industry,
    applications: sum(items, (item) => item.applications),
    repeatRate: rate(sum(items, (item) => item.repeatShifts), sum(items, (item) => item.shifts)),
    interviewRate: rate(sum(items, (item) => item.interviewRequests), sum(items, (item) => item.shifts)),
    offerRate: rate(sum(items, (item) => item.offers), sum(items, (item) => item.screenings))
  }));
}

export function getCompanyOutcomeData(data: KpiData = seedData) {
  const { companies } = data;
  const funnels = getLatestFunnels(data.funnels);
  return companies.map((company) => {
    const funnel = funnels.find((item) => item.companyId === company.id);
    return {
      name: company.name,
      industry: company.industry,
      offerRate: funnel ? rate(funnel.offers, funnel.screenings) : 0,
      joinRate: funnel ? rate(funnel.joins, funnel.offers) : 0,
      interviews: funnel?.interviewRequests ?? 0,
      offers: funnel?.offers ?? 0,
      joins: funnel?.joins ?? 0
    };
  });
}

export function getRepeatOfferCorrelation(data: KpiData = seedData) {
  const { surveys } = data;
  return surveys.map((survey) => ({
    repeatShiftCount: survey.repeatShiftCount,
    desireLift: survey.desireAfter - survey.desireBefore,
    offerScore: survey.offer ? 100 : 0,
    segment: survey.workerSegment
  }));
}

export function getSurveySummary(data: KpiData = seedData) {
  const { surveys } = data;
  if (surveys.length === 0) {
    return { desireLift: 0, avgUnderstanding: 0, repeatIntent: 0, screeningIntent: 0 };
  }

  return {
    desireLift: rate(sum(surveys, (survey) => survey.desireAfter - survey.desireBefore), surveys.length * 100),
    avgUnderstanding: sum(surveys, (survey) => survey.companyUnderstanding) / surveys.length,
    repeatIntent: sum(surveys, (survey) => survey.repeatIntent) / surveys.length,
    screeningIntent: sum(surveys, (survey) => survey.screeningIntent) / surveys.length
  };
}

export function getLtvCac(data: KpiData = seedData) {
  const { companies } = data;
  const contracted = companies.filter(hasContractStarted);
  const avgMrr = sum(contracted, (company) => company.expectedMrr) / Math.max(1, contracted.length);
  const avgSuccessFee = sum(contracted, (company) => company.successFee * company.expectedHires) / Math.max(1, contracted.length);
  const cac = getExecutiveKpis(data).cac;
  const ltv = Math.round(avgMrr * 12 * 0.71 + avgSuccessFee * 0.71);
  return {
    ltv,
    cac,
    ratio: cac === 0 ? 0 : ltv / cac,
    paybackMonths: avgMrr === 0 ? 0 : cac / (avgMrr * 0.71)
  };
}

export function getUnitRows(data: KpiData = seedData) {
  const { companies, unitEconomics } = data;
  const funnels = getLatestFunnels(data.funnels);
  const current = unitEconomics[unitEconomics.length - 1] ?? defaultUnitEconomics;
  const hours = sum(companies, (company) => company.salesHours + company.csHours);
  const offers = sum(funnels, (funnel) => funnel.offers);
  return [
    { label: "1社獲得コスト", value: yen(getExecutiveKpis(data).cac), sub: "営業・提案・初期CSを含む" },
    { label: "営業工数", value: `${sum(companies, (company) => company.salesHours)}h`, sub: "全リード累計" },
    { label: "CS工数", value: `${sum(companies, (company) => company.csHours)}h`, sub: "PoC/受注企業中心" },
    { label: "1内定あたり工数", value: `${Math.round(hours / Math.max(1, offers))}h`, sub: "営業 + CS / 内定数" },
    { label: "月間運用コスト", value: yen(current.operatingCost), sub: "人件費・運用・ツール" },
    { label: "粗利率", value: pct(current.grossMarginRate * 100), sub: "最新月" },
    { label: "1社LTV試算", value: yen(getLtvCac(data).ltv), sub: "12ヶ月継続 + 成功報酬" },
    { label: "回収期間", value: `${getLtvCac(data).paybackMonths.toFixed(1)}ヶ月`, sub: "CAC / 月次粗利" }
  ];
}

export { kpiSnapshots };
