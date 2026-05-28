import { NextResponse } from "next/server";
import { deleteAttendanceRecord } from "@/lib/attendance";
import { verifyAdminPin } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const body = await request.json();
    if (!await verifyAdminPin(body?.pin)) return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
    const { id } = await context.params;
    await deleteAttendanceRecord(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
