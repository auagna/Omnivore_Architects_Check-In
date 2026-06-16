import { NextResponse } from "next/server";
import { deleteAttendanceRecord, updateAttendanceRecord } from "@/lib/attendance";
import { validateAttendanceUpdatePayload } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const body = await request.json();
    const validation = validateAttendanceUpdatePayload(body);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { id } = await context.params;
    const result = await updateAttendanceRecord(id, validation.data);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ record: result.record });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteAttendanceRecord(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return NextResponse.json({ error: message }, { status: 500 });
}
