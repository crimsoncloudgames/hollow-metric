import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  type FinancialProjectAccessState,
  normalizeFinancialProject,
  type FinancialProjectDraft,
} from "@/lib/financial-projects";

export const runtime = "nodejs";

type FinancialProjectRow = {
  id: number;
  project_data?: FinancialProjectDraft | null;
};

type UserEntitlementRow = {
  tier?: string | null;
  premium_access?: boolean | null;
  billing_state?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatSupabaseError(
  error: {
    message?: string | null;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
  } | null | undefined
): string {
  if (!error) {
    return "Unknown database error.";
  }

  return [
    error.message,
    error.details,
    error.hint,
    error.code ? `code ${error.code}` : null,
  ]
    .filter((value): value is string => Boolean(value && value.trim().length > 0))
    .join(" | ");
}

function isMissingProjectNameColumnError(
  error: {
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null | undefined
): boolean {
  const combinedMessage = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    combinedMessage.includes("project_name") &&
    (combinedMessage.includes("does not exist") ||
      combinedMessage.includes("schema cache") ||
      combinedMessage.includes("column"))
  );
}

function formatBillingStatusLabel(
  billingState: string | null | undefined,
  fallback: string
): string {
  if (typeof billingState !== "string" || billingState.trim().length === 0) {
    return fallback;
  }

  const normalized = billingState.trim().replace(/_/g, " ");
  return normalized[0].toUpperCase() + normalized.slice(1);
}

function deriveFinancialProjectAccess(
  entitlement: UserEntitlementRow | null
): FinancialProjectAccessState {
  if (!entitlement) {
    return {
      subscriptionTier: "starter",
      billingStatus: "No billing record",
      canAccessLibrary: false,
      canSaveProjects: false,
      projectLimit: 0,
    };
  }

  const normalizedBillingState =
    typeof entitlement.billing_state === "string"
      ? entitlement.billing_state.trim().toLowerCase()
      : "";
  const hasPaidAccess =
    entitlement.tier === "pro" &&
    entitlement.premium_access === true &&
    normalizedBillingState === "active";

  return {
    subscriptionTier: hasPaidAccess ? "launch-planner" : "starter",
    billingStatus: formatBillingStatusLabel(entitlement.billing_state, "Unknown"),
    canAccessLibrary: hasPaidAccess,
    canSaveProjects: hasPaidAccess,
    projectLimit: hasPaidAccess ? 1 : 0,
  };
}

async function loadFinancialProjectAccess({
  supabase,
  userId,
}: {
  supabase: NonNullable<ReturnType<typeof createServerClient>>;
  userId: string;
}) {
  const { data: entitlement, error } = await supabase
    .from("user_entitlements")
    .select("tier, premium_access, billing_state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      access: null,
      error,
    };
  }

  return {
    access: deriveFinancialProjectAccess(
      (entitlement as UserEntitlementRow | null) ?? null
    ),
    error: null,
  };
}

function getFinancialProjectRowList(rows: unknown): FinancialProjectRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter(
    (row): row is FinancialProjectRow =>
      isRecord(row) && typeof row.id === "number"
  );
}

function getLatestFinancialProjectRow(
  rowList: FinancialProjectRow[]
): FinancialProjectRow | null {
  return rowList.reduce<FinancialProjectRow | null>((latestRow, row) => {
    if (!latestRow || row.id > latestRow.id) {
      return row;
    }

    return latestRow;
  }, null);
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase configuration error." },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { access, error: accessError } = await loadFinancialProjectAccess({
    supabase,
    userId: user.id,
  });

  if (accessError || !access) {
    const formattedError = formatSupabaseError(accessError);
    console.error("Failed to load financial project entitlements", {
      error: accessError,
      userId: user.id,
    });
    return NextResponse.json(
      { error: `Failed to load financial project entitlements: ${formattedError}` },
      { status: 500 }
    );
  }

  if (!access.canAccessLibrary || access.projectLimit < 1) {
    return NextResponse.json({ success: true, access, projects: [] });
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from("financial_projects")
    .select("id, project_data")
    .eq("user_id", user.id);

  if (existingRowsError) {
    const formattedError = formatSupabaseError(existingRowsError);
    console.error("Failed to load saved financial projects", {
      error: existingRowsError,
      userId: user.id,
    });
    return NextResponse.json(
      { error: `Failed to load saved financial projects: ${formattedError}` },
      { status: 500 }
    );
  }

  const rowList = getFinancialProjectRowList(existingRows);
  const latestRow = getLatestFinancialProjectRow(rowList);

  if (rowList.length > access.projectLimit) {
    console.warn("Saved financial project rows exceed current plan limit", {
      count: rowList.length,
      projectLimit: access.projectLimit,
      userId: user.id,
    });
  }

  const projects =
    latestRow && isRecord(latestRow.project_data)
      ? [
          normalizeFinancialProject(
            latestRow.project_data as FinancialProjectDraft
          ),
        ].slice(0, access.projectLimit)
      : [];

  return NextResponse.json({ success: true, access, projects });
}

async function writeFinancialProject({
  existingRowId,
  includeProjectName,
  project,
  supabase,
  userId,
}: {
  existingRowId?: number;
  includeProjectName: boolean;
  project: ReturnType<typeof normalizeFinancialProject>;
  supabase: NonNullable<ReturnType<typeof createServerClient>>;
  userId: string;
}) {
  const payload = includeProjectName
    ? {
        user_id: userId,
        project_name: project.name,
        project_data: project,
      }
    : {
        user_id: userId,
        project_data: project,
      };

  if (typeof existingRowId === "number") {
    return supabase
      .from("financial_projects")
      .update(payload)
      .eq("id", existingRowId)
      .eq("user_id", userId)
      .select("id, project_data")
      .single();
  }

  return supabase
    .from("financial_projects")
    .insert(payload)
    .select("id, project_data")
    .single();
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase configuration error." },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid project payload." }, { status: 400 });
  }

  const { access, error: accessError } = await loadFinancialProjectAccess({
    supabase,
    userId: user.id,
  });

  if (accessError || !access) {
    const formattedError = formatSupabaseError(accessError);
    console.error("Failed to load financial project entitlements", {
      error: accessError,
      userId: user.id,
    });
    return NextResponse.json(
      { error: `Failed to load financial project entitlements: ${formattedError}` },
      { status: 500 }
    );
  }

  if (!access.canSaveProjects || access.projectLimit < 1) {
    return NextResponse.json(
      {
        error:
          "Saving financial projects requires an active Launch Planner subscription.",
      },
      { status: 403 }
    );
  }

  const projectInput = isRecord(body.project) ? body.project : body;
  const { data: existingRows, error: existingRowsError } = await supabase
    .from("financial_projects")
    .select("id, project_data")
    .eq("user_id", user.id);

  if (existingRowsError) {
    const formattedError = formatSupabaseError(existingRowsError);
    console.error("Failed to load existing financial project", {
      error: existingRowsError,
      userId: user.id,
    });
    return NextResponse.json(
      { error: `Failed to load existing financial project: ${formattedError}` },
      { status: 500 }
    );
  }

  const rowList = getFinancialProjectRowList(existingRows);
  const existingRow = getLatestFinancialProjectRow(rowList);

  if (rowList.length > 1) {
    console.warn("Multiple financial project rows found for user; updating the most recent row", {
      count: rowList.length,
      projectLimit: access.projectLimit,
      userId: user.id,
    });
  }

  const existingProjectData = isRecord(
    (existingRow as FinancialProjectRow | null)?.project_data
  )
    ? ((existingRow as FinancialProjectRow).project_data as Record<string, unknown>)
    : null;
  const requestProjectId =
    typeof projectInput.id === "string" && projectInput.id.trim().length > 0
      ? projectInput.id.trim()
      : undefined;
  const existingProjectId =
    typeof existingProjectData?.id === "string" && existingProjectData.id.trim().length > 0
      ? existingProjectData.id.trim()
      : undefined;
  const project = normalizeFinancialProject({
    ...(projectInput as FinancialProjectDraft),
    id: requestProjectId ?? existingProjectId,
  });

  if (project.totalPlannedSpend <= 0) {
    return NextResponse.json(
      { error: "Project spend must be greater than zero before saving." },
      { status: 400 }
    );
  }

  if (project.pricePoints.length === 0 || project.breakEvenResults.length === 0) {
    return NextResponse.json(
      { error: "Add at least one valid price point and break-even result before saving." },
      { status: 400 }
    );
  }

  let writeResult = await writeFinancialProject({
    existingRowId: existingRow?.id,
    includeProjectName: true,
    project,
    supabase,
    userId: user.id,
  });

  if (writeResult.error && isMissingProjectNameColumnError(writeResult.error)) {
    console.warn("financial_projects.project_name is missing in the live database; retrying save without that column", {
      error: writeResult.error,
      userId: user.id,
    });
    writeResult = await writeFinancialProject({
      existingRowId: existingRow?.id,
      includeProjectName: false,
      project,
      supabase,
      userId: user.id,
    });
  }

  const { data, error } = writeResult;

  if (error) {
    const formattedError = formatSupabaseError(error);
    console.error("Failed to save financial project", {
      error,
      existingRowId: existingRow?.id,
      userId: user.id,
    });
    return NextResponse.json(
      { error: `Failed to save financial project: ${formattedError}` },
      { status: 500 }
    );
  }

  const savedProject = normalizeFinancialProject(
    ((data as FinancialProjectRow | null)?.project_data ?? project) as FinancialProjectDraft
  );

  return NextResponse.json({ success: true, project: savedProject });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase configuration error." },
      { status: 500 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await supabase
    .from("financial_projects")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    const formattedError = formatSupabaseError(error);
    console.error("Failed to clear financial project", {
      error,
      userId: user.id,
    });
    return NextResponse.json(
      { error: `Failed to clear financial project: ${formattedError}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}