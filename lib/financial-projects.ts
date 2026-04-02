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
  planningReview?: {
    healthScore: number;
    salesTargetPressure: string;
    costStructureSignal: string;
  };
  postLaunchActuals?: {
    actualCopiesSold: number;
    actualRefunds: number;
    actualNetRevenue: number;
    comparisonSummary: string;
  };
};

const FINANCIAL_PROJECTS_STORAGE_KEY = "hm_financial_projects";

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
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(FINANCIAL_PROJECTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as FinancialProject[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveFinancialProjects(projects: FinancialProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FINANCIAL_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export function buildFinancialProjectTemplate(index: number): FinancialProject {
  const template = projectTemplates[index % projectTemplates.length];

  return {
    ...template,
    id: `proj-${Date.now()}-${index + 1}`,
    name: `Project ${index + 1}`,
    lastUpdated: new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}
