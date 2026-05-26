import { createClient } from "@supabase/supabase-js";
import { AppData, ClientPhase, Company, Experiment, Funnel, Survey, UnitEconomics } from "./types";

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

function fromCompany(row: DbCompany): Company {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    area: row.area ?? "関東",
    owner: row.owner,
    email: row.email ?? "",
    status: row.status,
    clientPhase: row.client_phase ?? "P0",
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

function toCompanyRow(company: Company, includeClientPhase = true) {
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
  return includeClientPhase ? { ...row, client_phase: company.clientPhase ?? "P0" } : row;
}

function fromFunnel(row: DbFunnel): Funnel {
  return {
    id: row.id,
    companyId: row.company_id,
    recordedAt: dateToInput(row.month) ?? "",
    brazeDeliveries: row.braze_deliveries ?? 0,
    calls: row.calls ?? 0,
    surveyInterviews: row.survey_interviews ?? 0,
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

function toFunnelRow(funnel: Funnel) {
  return {
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
  const [companies, funnels, surveys, unitEconomics, experiments] = await Promise.all([
    client.from("companies").select("*").order("created_at", { ascending: false }),
    client.from("worker_funnels").select("*").order("month", { ascending: false }),
    client.from("student_surveys").select("*").order("answered_at", { ascending: false }),
    client.from("unit_economics").select("*").order("month", { ascending: true }),
    client.from("experiments").select("*").order("created_at", { ascending: false })
  ]);

  const error = companies.error ?? funnels.error ?? surveys.error ?? unitEconomics.error ?? experiments.error;
  if (error) throw error;

  return {
    companies: (companies.data ?? []).map((row) => fromCompany(row as DbCompany)),
    funnels: (funnels.data ?? []).map((row) => fromFunnel(row as DbFunnel)),
    surveys: (surveys.data ?? []).map((row) => fromSurvey(row as DbSurvey)),
    unitEconomics: (unitEconomics.data ?? []).map((row) => fromUnitEconomics(row as DbUnitEconomics)),
    experiments: (experiments.data ?? []).map((row) => fromExperiment(row as DbExperiment))
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

  return {
    ...data,
    companies,
    funnels,
    surveys
  };
}

export async function upsertAppData(data: AppData) {
  const client = requireSupabase();
  const prepared = prepareAppDataForSupabase(data);

  if (prepared.companies.length > 0) {
    const { error } = await client.from("companies").upsert(prepared.companies.map((company) => toCompanyRow(company)));
    if (error) {
      if (isMissingClientPhaseColumn(error)) {
        const retry = await client.from("companies").upsert(prepared.companies.map((company) => toCompanyRow(company, false)));
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
    }
  }

  if (prepared.unitEconomics.length > 0) {
    const { error } = await client.from("unit_economics").upsert(prepared.unitEconomics.map(toUnitEconomicsRow), { onConflict: "month" });
    if (error) throw error;
  }

  if (prepared.funnels.length > 0) {
    const { error } = await client.from("worker_funnels").upsert(prepared.funnels.map(toFunnelRow));
    if (error) throw error;
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
  const { error } = await client.from("companies").upsert(toCompanyRow(company));
  if (error) {
    if (isMissingClientPhaseColumn(error)) {
      const retry = await client.from("companies").upsert(toCompanyRow(company, false));
      if (retry.error) throw retry.error;
      return { clientPhasePersisted: false };
    }
    throw error;
  }
  return { clientPhasePersisted: true };
}

function isMissingClientPhaseColumn(error: { message?: string; code?: string }) {
  return error.code === "PGRST204" || (error.message ?? "").includes("client_phase");
}

export async function deleteCompanyRecord(id: string) {
  const { error } = await requireSupabase().from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertFunnel(funnel: Funnel) {
  const { error } = await requireSupabase().from("worker_funnels").upsert(toFunnelRow(funnel));
  if (error) throw error;
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
