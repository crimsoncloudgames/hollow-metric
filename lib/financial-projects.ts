export type FinancialProject = {
  id: string;
  name: string;
  lastUpdated: string;
  totalPlannedSpend: number;
  mainPricePoint: number;
  roughBreakEvenCopies: number;
  budgetStatus: string;
  expenses: Array<{ name: string; amount: number }>;
  platformFee: number;
  withholdingTax: number;
  refundsAssumption: number;
  pricePoints: number[];
  breakEvenResults: number[];
  netRevenuePerCopy?: number[];
  planningReview?: {
    healthScore: number;
    salesTargetPressure: string;
    costStructureSignal: string;
    insights?: string[];
  };
  postLaunchActuals?: {
    actualLaunchPricePoint?: number;
    actualLaunchPrice?: number;
    actualCopiesSold: number;
    actualRefunds: number | null;
    actualGrossRevenue?: number;
    actualNetRevenue: number;
    comparisonSummary: string;
    comparisonBullets?: string[];
  };
};

export type FinancialProjectDraft = {
  id?: unknown;
  name?: unknown;
  lastUpdated?: unknown;
  totalPlannedSpend?: unknown;
  mainPricePoint?: unknown;
  roughBreakEvenCopies?: unknown;
  budgetStatus?: unknown;
  expenses?: unknown;
  platformFee?: unknown;
  withholdingTax?: unknown;
  refundsAssumption?: unknown;
  pricePoints?: unknown;
  breakEvenResults?: unknown;
  netRevenuePerCopy?: unknown;
  planningReview?: unknown;
  postLaunchActuals?: unknown;
};

export type FinancialProjectSubscriptionTier = "starter" | "launch-planner";

export type FinancialProjectAccessState = {
  subscriptionTier: FinancialProjectSubscriptionTier;
  billingStatus: string;
  canAccessLibrary: boolean;
  canSaveProjects: boolean;
  projectLimit: number;
};

export type SavedFinancialProjectsState = {
  access: FinancialProjectAccessState;
  projects: FinancialProject[];
};

export const DEFAULT_FINANCIAL_PROJECT_ACCESS: FinancialProjectAccessState = {
  subscriptionTier: "starter",
  billingStatus: "Unavailable",
  canAccessLibrary: false,
  canSaveProjects: false,
  projectLimit: 0,
};

export const FINANCIAL_PROJECTS_STORAGE_KEY = "hm_financial_projects";
export const FINANCIAL_PROJECTS_UPDATED_EVENT = "hm-financial-projects-updated";
const DEFAULT_PROJECT_NAME = "Launch Budget Project";
const EMPTY_FINANCIAL_PROJECTS: FinancialProject[] = [];

let cachedSavedProjectsRaw: string | null | undefined;
let cachedSavedProjectsSnapshot: FinancialProject[] = EMPTY_FINANCIAL_PROJECTS;

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const sanitizeText = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  return trimmed || fallback;
};

const clampPercent = (value: unknown): number => {
  const numeric = toFiniteNumber(value, 0);
  return Math.max(0, Math.min(100, numeric));
};

const toNullablePercent = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return clampPercent(value);
};

const toNonNegativeMoney = (value: unknown): number =>
  Math.max(0, toFiniteNumber(value, 0));

const toNonNegativeCount = (value: unknown): number =>
  Math.max(0, Math.round(toFiniteNumber(value, 0)));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function normalizeExpenses(expenses: unknown): Array<{ name: string; amount: number }> {
  if (!Array.isArray(expenses)) return [];

  return expenses
    .map((expense, index) => {
      if (!isRecord(expense)) return null;

      const rawName = sanitizeText(expense.name);
      const amount = toNonNegativeMoney(expense.amount);

      if (!rawName && amount <= 0) {
        return null;
      }

      return {
        name: rawName || `Expense ${index + 1}`,
        amount,
      };
    })
    .filter((expense): expense is { name: string; amount: number } => expense !== null);
}

function normalizeNumberArray(
  values: unknown,
  options?: { integers?: boolean }
): number[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => toFiniteNumber(value, 0))
    .filter((value) => value > 0)
    .map((value) => (options?.integers ? Math.round(value) : value));
}

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => sanitizeText(value))
    .filter((value) => value.length > 0);
}

function normalizeFinancialProjectAccessState(
  value: unknown
): FinancialProjectAccessState {
  if (!isRecord(value)) {
    return DEFAULT_FINANCIAL_PROJECT_ACCESS;
  }

  const subscriptionTier =
    value.subscriptionTier === "launch-planner" ? "launch-planner" : "starter";
  const billingStatus = sanitizeText(
    value.billingStatus,
    DEFAULT_FINANCIAL_PROJECT_ACCESS.billingStatus
  );
  const requestedProjectLimit = Math.max(
    0,
    Math.round(
      toFiniteNumber(
        value.projectLimit,
        subscriptionTier === "launch-planner" ? 1 : 0
      )
    )
  );
  const canAccessLibrary =
    subscriptionTier === "launch-planner" &&
    value.canAccessLibrary === true &&
    requestedProjectLimit > 0;
  const canSaveProjects =
    subscriptionTier === "launch-planner" &&
    value.canSaveProjects === true &&
    requestedProjectLimit > 0;

  return {
    subscriptionTier,
    billingStatus,
    canAccessLibrary,
    canSaveProjects,
    projectLimit: canAccessLibrary || canSaveProjects ? requestedProjectLimit : 0,
  };
}

export function formatProjectLastUpdated(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function createFinancialProjectId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeFinancialProject(draft: FinancialProjectDraft): FinancialProject {
  const pricePoints = normalizeNumberArray(draft.pricePoints);
  const breakEvenResults = normalizeNumberArray(draft.breakEvenResults, {
    integers: true,
  });
  const netRevenuePerCopy = normalizeNumberArray(draft.netRevenuePerCopy);
  const planningReview = isRecord(draft.planningReview) ? draft.planningReview : null;
  const postLaunchActuals = isRecord(draft.postLaunchActuals)
    ? draft.postLaunchActuals
    : null;
  const planningInsights = planningReview
    ? normalizeStringArray(planningReview.insights)
    : [];
  const comparisonBullets = postLaunchActuals
    ? normalizeStringArray(postLaunchActuals.comparisonBullets)
    : [];
  const actualLaunchPricePoint = postLaunchActuals
    ? toNonNegativeCount(postLaunchActuals.actualLaunchPricePoint)
    : 0;
  const actualLaunchPrice = postLaunchActuals
    ? toNonNegativeMoney(postLaunchActuals.actualLaunchPrice)
    : 0;
  const actualGrossRevenue = postLaunchActuals
    ? toNonNegativeMoney(postLaunchActuals.actualGrossRevenue)
    : 0;
  const actualRefunds = postLaunchActuals
    ? toNullablePercent(postLaunchActuals.actualRefunds)
    : null;

  return {
    id: sanitizeText(draft.id, createFinancialProjectId()),
    name: sanitizeText(draft.name, DEFAULT_PROJECT_NAME),
    lastUpdated: sanitizeText(draft.lastUpdated, formatProjectLastUpdated()),
    totalPlannedSpend: toNonNegativeMoney(draft.totalPlannedSpend),
    mainPricePoint: toNonNegativeMoney(draft.mainPricePoint ?? pricePoints[0] ?? 0),
    roughBreakEvenCopies: toNonNegativeCount(
      draft.roughBreakEvenCopies ?? breakEvenResults[0] ?? 0
    ),
    budgetStatus: sanitizeText(draft.budgetStatus, "Needs review"),
    expenses: normalizeExpenses(draft.expenses),
    platformFee: clampPercent(draft.platformFee),
    withholdingTax: clampPercent(draft.withholdingTax),
    refundsAssumption: clampPercent(draft.refundsAssumption),
    pricePoints,
    breakEvenResults,
    ...(netRevenuePerCopy.length > 0 ? { netRevenuePerCopy } : {}),
    planningReview: planningReview
      ? {
          healthScore: toNonNegativeCount(planningReview.healthScore),
          salesTargetPressure: sanitizeText(
            planningReview.salesTargetPressure,
            "Moderate"
          ),
          costStructureSignal: sanitizeText(
            planningReview.costStructureSignal,
            "Needs Review"
          ),
          ...(planningInsights.length > 0 ? { insights: planningInsights } : {}),
        }
      : undefined,
    postLaunchActuals:
      postLaunchActuals && toNonNegativeCount(postLaunchActuals.actualCopiesSold) > 0
        ? {
            ...(actualLaunchPricePoint > 0 ? { actualLaunchPricePoint } : {}),
            ...(actualLaunchPrice > 0 ? { actualLaunchPrice } : {}),
            actualCopiesSold: toNonNegativeCount(postLaunchActuals.actualCopiesSold),
            actualRefunds,
            ...(actualGrossRevenue > 0 ? { actualGrossRevenue } : {}),
            actualNetRevenue: toNonNegativeMoney(postLaunchActuals.actualNetRevenue),
            comparisonSummary: sanitizeText(
              postLaunchActuals.comparisonSummary,
              "Saved from launch budget"
            ),
            ...(comparisonBullets.length > 0
              ? { comparisonBullets }
              : {}),
          }
        : undefined,
  };
}

const projectTemplates: Omit<FinancialProject, "id" | "lastUpdated" | "name">[] = [
  {
    totalPlannedSpend: 30200,
    mainPricePoint: 16.99,
    roughBreakEvenCopies: 5374,
    budgetStatus: "Needs review",
    expenses: [
      { name: "Development", amount: 18000 },
      { name: "Marketing", amount: 4500 },
      { name: "Trailer", amount: 1500 },
      { name: "Contractors", amount: 2500 },
      { name: "Other", amount: 3700 },
    ],
    platformFee: 30,
    withholdingTax: 30,
    refundsAssumption: 8,
    pricePoints: [12.99, 16.99, 19.99],
    breakEvenResults: [7023, 5374, 4561],
    planningReview: {
      healthScore: 68,
      salesTargetPressure: "Moderate",
      costStructureSignal: "Needs Review",
    },
    postLaunchActuals: {
      actualCopiesSold: 5100,
      actualRefunds: 9.2,
      actualNetRevenue: 27840,
      comparisonSummary: "Close to original planning target",
    },
  },
  {
    totalPlannedSpend: 18400,
    mainPricePoint: 14.99,
    roughBreakEvenCopies: 3912,
    budgetStatus: "Balanced",
    expenses: [
      { name: "Development", amount: 11000 },
      { name: "Marketing", amount: 2800 },
      { name: "QA", amount: 1300 },
      { name: "Localization", amount: 900 },
      { name: "Other", amount: 2400 },
    ],
    platformFee: 30,
    withholdingTax: 20,
    refundsAssumption: 7,
    pricePoints: [12.99, 14.99, 17.99],
    breakEvenResults: [4540, 3912, 3233],
    planningReview: {
      healthScore: 77,
      salesTargetPressure: "Lighter",
      costStructureSignal: "Balanced",
    },
  },
];

export function getSavedFinancialProjects(): FinancialProject[] {
  if (typeof window === "undefined") return EMPTY_FINANCIAL_PROJECTS;

  const raw = window.localStorage.getItem(FINANCIAL_PROJECTS_STORAGE_KEY);
  if (raw === cachedSavedProjectsRaw) {
    return cachedSavedProjectsSnapshot;
  }

  if (!raw) {
    cachedSavedProjectsRaw = null;
    cachedSavedProjectsSnapshot = EMPTY_FINANCIAL_PROJECTS;
    return cachedSavedProjectsSnapshot;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedSavedProjectsRaw = raw;
      cachedSavedProjectsSnapshot = EMPTY_FINANCIAL_PROJECTS;
      return cachedSavedProjectsSnapshot;
    }

    cachedSavedProjectsRaw = raw;
    cachedSavedProjectsSnapshot = parsed.map((project) =>
      normalizeFinancialProject(project as FinancialProjectDraft)
    );
    return cachedSavedProjectsSnapshot;
  } catch {
    cachedSavedProjectsRaw = raw;
    cachedSavedProjectsSnapshot = EMPTY_FINANCIAL_PROJECTS;
    return cachedSavedProjectsSnapshot;
  }
}

export function saveFinancialProjects(projects: FinancialProject[]) {
  if (typeof window === "undefined") return;

  const normalizedProjects = projects.map((project) =>
    normalizeFinancialProject(project)
  );

  const serializedProjects = JSON.stringify(normalizedProjects);

  if (serializedProjects !== cachedSavedProjectsRaw) {
    cachedSavedProjectsRaw = serializedProjects;
    cachedSavedProjectsSnapshot = normalizedProjects;
  }

  window.localStorage.setItem(FINANCIAL_PROJECTS_STORAGE_KEY, serializedProjects);

  window.dispatchEvent(new Event(FINANCIAL_PROJECTS_UPDATED_EVENT));
}

export async function fetchSavedFinancialProjectsState(): Promise<SavedFinancialProjectsState> {
  const response = await fetch("/api/save-financial-project", {
    method: "GET",
    cache: "no-store",
  });

  const rawResponse = await response.text();
  let result:
    | {
        success?: boolean;
        error?: string;
        access?: unknown;
        projects?: unknown;
      }
    | null = null;

  if (rawResponse) {
    try {
      result = JSON.parse(rawResponse) as {
        success?: boolean;
        error?: string;
        access?: unknown;
        projects?: unknown;
      };
    } catch {
      result = null;
    }
  }

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.error ?? rawResponse.trim() ?? `Request failed with status ${response.status}.`
    );
  }

  const access = normalizeFinancialProjectAccessState(result.access);
  const projects = Array.isArray(result.projects)
    ? result.projects
        .map((project) => normalizeFinancialProject(project as FinancialProjectDraft))
        .slice(0, Math.max(0, access.projectLimit))
    : EMPTY_FINANCIAL_PROJECTS;

  return {
    access,
    projects: access.canAccessLibrary ? projects : EMPTY_FINANCIAL_PROJECTS,
  };
}

export function clearSavedFinancialProjects(): FinancialProject[] {
  saveFinancialProjects([]);
  return EMPTY_FINANCIAL_PROJECTS;
}

export function upsertSavedFinancialProject(
  project: FinancialProject,
  maxProjects = 1
): FinancialProject[] {
  const normalizedProject = normalizeFinancialProject(project);
  const nextProjects = [
    normalizedProject,
    ...getSavedFinancialProjects().filter(
      (existingProject) => existingProject.id !== normalizedProject.id
    ),
  ].slice(0, Math.max(1, maxProjects));

  saveFinancialProjects(nextProjects);
  return nextProjects;
}

export function buildFinancialProjectTemplate(index: number): FinancialProject {
  const template = projectTemplates[index % projectTemplates.length];

  return normalizeFinancialProject({
    ...template,
    id: createFinancialProjectId(),
    name: `Project ${index + 1}`,
    lastUpdated: formatProjectLastUpdated(),
  });
}
