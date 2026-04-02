import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { projectName } = await req.json();

    if (!projectName) {
      return NextResponse.json(
        { error: "Missing projectName parameter" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase configuration error" },
        { status: 500 }
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO(security): RLS policies must enforce per-user report access in the database.
    // TODO(security): Never rely on client-provided project names without user-bound filtering.
    // First, try to delete with project_name filter
    let deleteQuery = supabase
      .from("reports")
      .delete()
      .eq("user_id", user.id);

    if (projectName === "Uncategorized") {
      deleteQuery = deleteQuery.is("project_name", null);
    } else {
      deleteQuery = deleteQuery.eq("project_name", projectName);
    }

    let { error } = await deleteQuery;

    // If project_name column doesn't exist, delete all reports for this user
    if (error && error.message.includes("project_name does not exist")) {
      const { error: fallbackError } = await supabase
        .from("reports")
        .delete()
        .eq("user_id", user.id);

      if (fallbackError) {
        console.error("Fallback delete error:", fallbackError);
        return NextResponse.json(
          { error: `Failed to delete reports: ${fallbackError.message}` },
          { status: 500 }
        );
      }
    } else if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        { error: `Failed to delete reports: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
