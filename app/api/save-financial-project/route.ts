import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import {
  normalizeFinancialProject,
  type FinancialProjectDraft,
} from "@/lib/financial-projects";

export const runtime = "nodejs";

type FinancialProjectRow = {
  id: number;
  project_data?: FinancialProjectDraft | null;
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

  const rowList = Array.isArray(existingRows) ? existingRows : [];
  const existingRow = rowList.reduce<FinancialProjectRow | null>((latestRow, row) => {
    if (!row || typeof row.id !== "number") {
      return latestRow;
    }

    if (!latestRow || row.id > latestRow.id) {
      return row as FinancialProjectRow;
    }

    return latestRow;
  }, null);

  if (rowList.length > 1) {
    console.warn("Multiple financial project rows found for user; updating the most recent row", {
      count: rowList.length,
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

  // TODO(security): Enforce billing tier and save limits from trusted server-owned entitlements.
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