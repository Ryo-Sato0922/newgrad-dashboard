import { createClient } from "@supabase/supabase-js";
import { AppData, BusinessPlan, ClientPhase, Company, Experiment, ForecastRating, Funnel, InflowSourceFunnel, Survey, UnitEconomics } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;

type DbCompany = {
  id: string;
  name: string;
  industry: string;
  area: string | null;
  owner: string;
  email: string | null;
  status: Company["status"];
  client_phase?: ClientPhase | null;
  forecast_rating?: ForecastRating | null;
  na_scheduled_date?: string | null;
  deal_memo?: string | null;
  expected_mrr: number;
  contract_months: number | null;
  success_fee: number;
  expected_hires: number;
  initial_meeting_date: string | null;
  application_received_date: string | null;
  proposal_date: string | null;
  contract_target_date: string | null;
  contract_start_date: string | null;
  lost_reason: string | null;
  memo: string | null;
  sales_hours: number | string;
  cs_hours: number | string;
  acquisition_cost: number | null;
};

type DbFunnel = {
  id: string;
  company_id: string;
  month: string;
  braze_deliveries: number | null;
  calls: number | null;
  survey_interviews: number | null;
  overview_recommendations?: number | null;
  source_funnels?: Partial<Record<string, InflowSourceFunnel>> | null;
  views: number | null;
  applications: number | null;
  shifts: number | null;
  repeat_shifts: number | null;
  interview_requests: number | null;
  screenings: number | null;
  offers: number | null;
  joins: number | null;
  previous_month_applications: number | null;
};

type DbSurvey = {
  id: string;
  company_id: string;
  worker_segment: string;
  desire_before: number;
  desire_after: number;
  company_understanding: number;
  employee_understanding: number;
  repeat_intent: number;
  screening_intent: number;
  comment: string | null;
  repeat_shift_count: number;
  offer: boolean;
  join_plan: boolean;
};

type DbUnitEconomics = {
  month: string;
  operating_cost: number;
  gross_margin_rate: number | string;
  cohort: string;
  cohort_companies: number;
  retained_companies: number;
};

type DbBusinessPlan = {
  id: string;
  month: string;
  target_companies: number | null;
  memo: string | null;
};

type DbExperiment = {
  id: string;
  hypothesis: string;
  detail: string;
  period: string | null;
  status: Experiment["status"];
  result: string | null;
  learning: string | null;
  next_action: string | null;
};

const businessPlanExperimentPrefix = "__business_plan__:";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase環境変数が設定されていません");
  }
  return supabase;
}

function monthToInput(value: string) {
  return value.slice(0, 7);
}

function dateToInput(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

const forecastRatingMarkerPattern = /(?:\n\n)?<!-- forecast_rating:(★★★|★★|★|-) -->\s*$/;

function getForecastRatingFromDealMemo(value: string | null | undefined): ForecastRating | null {
  const match = (value ?? "").match(forecastRatingMarkerPattern);
  return match ? (match[1] as ForecastRating) : null;
}

function stripForecastRatingMarker(value: string | null | undefined) {
  return (value ?? "").replace(forecastRatingMarkerPattern, "");
}

function encodeForecastRatingInDealMemo(value: string | null | undefined, rating: ForecastRating | undefined) {
  const cleanValue = stripForecastRatingMarker(value);
  const separator = cleanValue ? "\n\n" : "";
  return `${cleanValue}${separator}<!-- forecast_rating:${rating ?? "-"} -->`;
}

function fromCompany(row: DbCompany): Company {
  const dealMemo = row.deal_memo ?? "";
  const memoForecastRating = getForecastRatingFromDealMemo(dealMemo);
  const dbForecastRating = row.forecast_rating ?? null;
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    area: row.area ?? "関東",
    owner: row.owner,
    email: row.email ?? "",
    status: row.status,
    clientPhase: row.client_phase ?? "P0",
    forecastRating: dbForecastRating && dbForecastRating !== "-" ? dbForecastRating : memoForecastRating ?? dbForecastRating ?? "-",
    naScheduledDate: dateToInput(row.na_scheduled_date ?? null),
    dealMemo: stripForecastRatingMarker(dealMemo),
    expectedMrr: row.expected_mrr,
    contractMonths: row.contract_months ?? 0,
    successFee: row.success_fee,
    expectedHires: row.expected_hires,
    initialMeetingDate: dateToInput(row.initial_meeting_date),
    applicationReceivedDate: dateToInput(row.application_received_date),
    proposalDate: dateToInput(row.proposal_date),
    contractTargetDate: dateToInput(row.contract_target_date),
    contractStartDate: dateToInput(row.contract_start_date),
    lostReason: row.lost_reason,
    memo: row.memo ?? "",
    salesHours: toNumber(row.sales_hours),
    csHours: toNumber(row.cs_hours),
    acquisitionCost: row.acquisition_cost ?? 0
  };
}

type CompanyOptionalColumn = "client_phase" | "forecast_rating" | "na_scheduled_date" | "deal_memo";

function toCompanyRow(company: Company, omittedColumns: CompanyOptionalColumn[] = []) {
  const row = {
    id: company.id,
    name: company.name,
    industry: company.industry,
    area: company.area,
    owner: company.owner,
    email: company.email,
    status: company.status,
    expected_mrr: company.expectedMrr,
    contract_months: company.contractMonths ?? 0,
    success_fee: company.successFee,
    expected_hires: company.expectedHires,
    initial_meeting_date: company.initialMeetingDate,
    application_received_date: company.applicationReceivedDate,
    proposal_date: company.proposalDate,
    contract_target_date: company.contractTargetDate,
    contract_start_date: company.contractStartDate,
    lost_reason: company.lostReason,
    memo: company.memo,
    sales_hours: company.salesHours,
    cs_hours: company.csHours,
    acquisition_cost: company.acquisitionCost
  };
  return {
    ...row,
    ...(!omittedColumns.includes("client_phase") ? { client_phase: company.clientPhase ?? "P0" } : {}),
    ...(!omittedColumns.includes("forecast_rating") ? { forecast_rating: company.forecastRating ?? "-" } : {}),
    ...(!omittedColumns.includes("na_scheduled_date") ? { na_scheduled_date: company.naScheduledDate ?? null } : {}),
    ...(!omittedColumns.includes("deal_memo")
      ? { deal_memo: omittedColumns.includes("forecast_rating") ? encodeForecastRatingInDealMemo(company.dealMemo, company.forecastRating) : stripForecastRatingMarker(company.dealMemo) }
      : {})
  };
}

function fromFunnel(row: DbFunnel): Funnel {
  return {
    id: row.id,
    companyId: row.company_id,
    recordedAt: dateToInput(row.month) ?? "",
    brazeDeliveries: row.braze_deliveries ?? 0,
    calls: row.calls ?? 0,
    surveyInterviews: row.survey_interviews ?? 0,
    overviewRecommendations: row.overview_recommendations ?? 0,
    sourceFunnels: row.source_funnels as Funnel["sourceFunnels"] ?? undefined,
    views: row.views ?? 0,
    applications: row.applications ?? 0,
    shifts: row.shifts ?? 0,
    repeatShifts: row.repeat_shifts ?? 0,
    interviewRequests: row.interview_requests ?? 0,
    screenings: row.screenings ?? 0,
    offers: row.offers ?? 0,
    joins: row.joins ?? 0,
    previousMonthApplications: row.previous_month_applications ?? 0
  };
}

function toFunnelRow(funnel: Funnel, includeSourceFields = true) {
  const row = {
    id: funnel.id,
    company_id: funnel.companyId,
    month: funnel.recordedAt,
    braze_deliveries: funnel.brazeDeliveries ?? 0,
    calls: funnel.calls ?? 0,
    survey_interviews: funnel.surveyInterviews ?? 0,
    views: funnel.views,
    applications: funnel.applications,
    shifts: funnel.shifts,
    repeat_shifts: funnel.repeatShifts,
    interview_requests: funnel.interviewRequests,
    screenings: funnel.screenings,
    offers: funnel.offers,
    joins: funnel.joins,
    previous_month_applications: funnel.previousMonthApplications
  };
  return includeSourceFields ? { ...row, overview_recommendations: funnel.overviewRecommendations ?? 0, source_funnels: funnel.sourceFunnels ?? {} } : row;
}

function fromSurvey(row: DbSurvey): Survey {
  return {
    id: row.id,
    companyId: row.company_id,
    workerSegment: row.worker_segment,
    desireBefore: row.desire_before,
    desireAfter: row.desire_after,
    companyUnderstanding: row.company_understanding,
    employeeUnderstanding: row.employee_understanding,
    repeatIntent: row.repeat_intent,
    screeningIntent: row.screening_intent,
    comment: row.comment ?? "",
    repeatShiftCount: row.repeat_shift_count,
    offer: row.offer,
    join: row.join_plan
  };
}

function toSurveyRow(survey: Survey) {
  return {
    id: survey.id,
    company_id: survey.companyId,
    worker_segment: survey.workerSegment,
    desire_before: survey.desireBefore,
    desire_after: survey.desireAfter,
    company_understanding: survey.companyUnderstanding,
    employee_understanding: survey.employeeUnderstanding,
    repeat_intent: survey.repeatIntent,
    screening_intent: survey.screeningIntent,
    comment: survey.comment,
    repeat_shift_count: survey.repeatShiftCount,
    offer: survey.offer,
    join_plan: survey.join
  };
}

function fromUnitEconomics(row: DbUnitEconomics): UnitEconomics {
  return {
    month: monthToInput(row.month),
    operatingCost: row.operating_cost,
    grossMarginRate: toNumber(row.gross_margin_rate),
    cohort: row.cohort,
    cohortCompanies: row.cohort_companies,
    retainedCompanies: row.retained_companies
  };
}

function toUnitEconomicsRow(item: UnitEconomics) {
  return {
    month: item.month.length === 7 ? `${item.month}-01` : item.month,
    operating_cost: item.operatingCost,
    gross_margin_rate: item.grossMarginRate,
    cohort: item.cohort,
    cohort_companies: item.cohortCompanies,
    retained_companies: item.retainedCompanies
  };
}

function fromBusinessPlan(row: DbBusinessPlan): BusinessPlan {
  return {
    id: row.id,
    month: monthToInput(row.month),
    targetCompanies: row.target_companies ?? 0,
    memo: row.memo ?? ""
  };
}

function toBusinessPlanRow(plan: BusinessPlan) {
  return {
    id: plan.id,
    month: plan.month.length === 7 ? `${plan.month}-01` : plan.month,
    target_companies: plan.targetCompanies,
    memo: plan.memo
  };
}

function isBusinessPlanExperiment(row: Pick<DbExperiment, "hypothesis">) {
  return row.hypothesis.startsWith(businessPlanExperimentPrefix);
}

function fromBusinessPlanExperiment(row: DbExperiment): BusinessPlan {
  return {
    id: row.id,
    month: row.hypothesis.replace(businessPlanExperimentPrefix, "").slice(0, 7),
    targetCompanies: Number(row.result ?? 0),
    memo: row.detail ?? ""
  };
}

function toBusinessPlanExperimentRow(plan: BusinessPlan) {
  return {
    id: plan.id,
    hypothesis: `${businessPlanExperimentPrefix}${plan.month}`,
    detail: plan.memo,
    period: null,
    status: "未実施" as const,
    result: String(plan.targetCompanies),
    learning: "",
    next_action: ""
  };
}

function fromExperiment(row: DbExperiment): Experiment {
  return {
    id: row.id,
    hypothesis: row.hypothesis,
    detail: row.detail,
    period: row.period ?? "",
    status: row.status,
    result: row.result ?? "",
    learning: row.learning ?? "",
    nextAction: row.next_action ?? ""
  };
}

export async function fetchAppData(): Promise<AppData> {
  const client = requireSupabase();
  const [companies, funnels, surveys, unitEconomics, businessPlans, experiments] = await Promise.all([
    client.from("companies").select("*").order("created_at", { ascending: false }),
    client.from("worker_funnels").select("*").order("month", { ascending: false }),
    client.from("student_surveys").select("*").order("answered_at", { ascending: false }),
    client.from("unit_economics").select("*").order("month", { ascending: true }),
    client.from("business_plans").select("*").order("month", { ascending: true }),
    client.from("experiments").select("*").order("created_at", { ascending: false })
  ]);

  const businessPlanError = businessPlans.error && !isMissingBusinessPlansTable(businessPlans.error) ? businessPlans.error : null;
  const error = companies.error ?? funnels.error ?? surveys.error ?? unitEconomics.error ?? businessPlanError ?? experiments.error;
  if (error) throw error;
  const experimentRows = (experiments.data ?? []) as DbExperiment[];
  const fallbackBusinessPlans = experimentRows.filter(isBusinessPlanExperiment).map(fromBusinessPlanExperiment);
  const visibleExperiments = experimentRows.filter((row) => !isBusinessPlanExperiment(row));

  return {
    companies: (companies.data ?? []).map((row) => fromCompany(row as DbCompany)),
    funnels: (funnels.data ?? []).map((row) => fromFunnel(row as DbFunnel)),
    surveys: (surveys.data ?? []).map((row) => fromSurvey(row as DbSurvey)),
    unitEconomics: (unitEconomics.data ?? []).map((row) => fromUnitEconomics(row as DbUnitEconomics)),
    businessPlans: businessPlans.error ? fallbackBusinessPlans : (businessPlans.data ?? []).map((row) => fromBusinessPlan(row as DbBusinessPlan)),
    experiments: visibleExperiments.map(fromExperiment)
  };
}

export function prepareAppDataForSupabase(data: AppData): AppData {
  const idMap = new Map<string, string>();
  const normalizeId = (id: string) => {
    if (isUuid(id)) return id;
    const existing = idMap.get(id);
    if (existing) return existing;
    const next = crypto.randomUUID();
    idMap.set(id, next);
    return next;
  };

  const companies = data.companies.map((company) => ({ ...company, id: normalizeId(company.id) }));
  const companyIds = new Set(companies.map((company) => company.id));
  const funnels = data.funnels
    .map((funnel) => ({ ...funnel, id: normalizeId(funnel.id), companyId: normalizeId(funnel.companyId) }))
    .filter((funnel) => companyIds.has(funnel.companyId));
  const surveys = data.surveys
    .map((survey) => ({ ...survey, id: normalizeId(survey.id), companyId: normalizeId(survey.companyId) }))
    .filter((survey) => companyIds.has(survey.companyId));
  const businessPlans = (data.businessPlans ?? []).map((plan) => ({ ...plan, id: normalizeId(plan.id) }));

  return {
    ...data,
    companies,
    funnels,
    surveys,
    businessPlans
  };
}

export async function upsertAppData(data: AppData) {
  const client = requireSupabase();
  const prepared = prepareAppDataForSupabase(data);

  if (prepared.companies.length > 0) {
    await upsertCompaniesWithColumnFallback(client, prepared.companies);
  }

  if (prepared.unitEconomics.length > 0) {
    const { error } = await client.from("unit_economics").upsert(prepared.unitEconomics.map(toUnitEconomicsRow), { onConflict: "month" });
    if (error) throw error;
  }

  if ((prepared.businessPlans ?? []).length > 0) {
    const { error } = await client.from("business_plans").upsert((prepared.businessPlans ?? []).map(toBusinessPlanRow), { onConflict: "month" });
    if (error) {
      if (isMissingBusinessPlansTable(error)) {
        await upsertBusinessPlanExperiments(client, prepared.businessPlans ?? []);
      } else {
        throw error;
      }
    }
  }

  if (prepared.funnels.length > 0) {
    const { error } = await client.from("worker_funnels").upsert(prepared.funnels.map((funnel) => toFunnelRow(funnel)));
    if (error) {
      if (isMissingFunnelSourceColumn(error)) {
        const retry = await client.from("worker_funnels").upsert(prepared.funnels.map((funnel) => toFunnelRow(funnel, false)));
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
    }
  }

  if (prepared.surveys.length > 0) {
    const { error } = await client.from("student_surveys").upsert(prepared.surveys.map(toSurveyRow));
    if (error) throw error;
  }

  return prepared;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function upsertCompany(company: Company) {
  const client = requireSupabase();
  const omittedColumns = await upsertCompaniesWithColumnFallback(client, [company]);
  return {
    clientPipelinePersisted: !["client_phase", "na_scheduled_date", "deal_memo"].some((column) => omittedColumns.includes(column as CompanyOptionalColumn)),
    forecastRatingPersisted: !omittedColumns.includes("forecast_rating") || !omittedColumns.includes("deal_memo")
  };
}

async function upsertCompaniesWithColumnFallback(client: ReturnType<typeof requireSupabase>, companies: Company[]) {
  const omittedColumns: CompanyOptionalColumn[] = [];

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await client.from("companies").upsert(companies.map((company) => toCompanyRow(company, omittedColumns)));
    if (!error) return omittedColumns;

    const missingColumn = getMissingCompanyOptionalColumn(error);
    if (!missingColumn || omittedColumns.includes(missingColumn)) {
      throw error;
    }
    omittedColumns.push(missingColumn);
  }

  return omittedColumns;
}

function getMissingCompanyOptionalColumn(error: { message?: string; code?: string }): CompanyOptionalColumn | null {
  const message = error.message ?? "";
  if (message.includes("forecast_rating") || message.includes("companies_forecast_rating_check")) return "forecast_rating";
  const columns: CompanyOptionalColumn[] = ["client_phase", "na_scheduled_date", "deal_memo"];
  return columns.find((column) => message.includes(column)) ?? null;
}

function isMissingFunnelSourceColumn(error: { message?: string; code?: string }) {
  const message = error.message ?? "";
  return error.code === "PGRST204" || ["overview_recommendations", "source_funnels"].some((column) => message.includes(column));
}

function isMissingBusinessPlansTable(error: { message?: string; code?: string }) {
  const message = error.message ?? "";
  return ["PGRST204", "PGRST205", "42P01"].includes(error.code ?? "") || message.includes("business_plans");
}

async function upsertBusinessPlanExperiments(client: ReturnType<typeof requireSupabase>, plans: BusinessPlan[]) {
  const { error } = await client.from("experiments").upsert(plans.map(toBusinessPlanExperimentRow), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteCompanyRecord(id: string) {
  const { error } = await requireSupabase().from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertFunnel(funnel: Funnel) {
  const client = requireSupabase();
  const { error } = await client.from("worker_funnels").upsert(toFunnelRow(funnel));
  if (error) {
    if (isMissingFunnelSourceColumn(error)) {
      const retry = await client.from("worker_funnels").upsert(toFunnelRow(funnel, false));
      if (retry.error) throw retry.error;
      return { sourceFunnelsPersisted: false };
    }
    throw error;
  }
  return { sourceFunnelsPersisted: true };
}

export async function deleteFunnelRecord(id: string) {
  const { error } = await requireSupabase().from("worker_funnels").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertSurvey(survey: Survey) {
  const { error } = await requireSupabase().from("student_surveys").upsert(toSurveyRow(survey));
  if (error) throw error;
}

export async function upsertUnitEconomics(item: UnitEconomics) {
  const { error } = await requireSupabase().from("unit_economics").upsert(toUnitEconomicsRow(item), { onConflict: "month" });
  if (error) throw error;
}

export async function upsertBusinessPlan(plan: BusinessPlan) {
  const client = requireSupabase();
  const { error } = await client.from("business_plans").upsert(toBusinessPlanRow(plan), { onConflict: "month" });
  if (error) {
    if (isMissingBusinessPlansTable(error)) {
      await upsertBusinessPlanExperiments(client, [plan]);
      return;
    }
    throw error;
  }
}

export async function deleteBusinessPlanRecord(id: string) {
  const client = requireSupabase();
  const { error } = await client.from("business_plans").delete().eq("id", id);
  if (error) {
    if (isMissingBusinessPlansTable(error)) {
      const fallback = await client.from("experiments").delete().eq("id", id);
      if (fallback.error) throw fallback.error;
      return;
    }
    throw error;
  }
}
