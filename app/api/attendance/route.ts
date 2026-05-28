import { NextResponse } from "next/server";
import { buildAttendanceStats, createAttendanceRecord, deleteAllAttendanceRecords, getActiveEvent, getEventById, listAttendanceRecords } from "@/lib/attendance";
import { validateAttendancePayload, verifyAdminPin } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEventId = searchParams.get("eventId") ?? undefined;
    const event = requestedEventId ? await getEventById(requestedEventId) : await getActiveEvent();
    const records = await listAttendanceRecords(requestedEventId ?? event?.id);
    return NextResponse.json({ records, stats: buildAttendanceStats(records, event?.capacity), event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateAttendancePayload(body);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
    const result = await createAttendanceRecord(validation.data);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ record: result.record }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    if (!await verifyAdminPin(body?.pin)) return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
    await deleteAllAttendanceRecords();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return NextResponse.json({ error: message }, { status: 500 });
}
