import { NextResponse } from "next/server";
import { findAttendanceRecord } from "@/lib/attendance";
import { validateLookupPayload } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateLookupPayload(body);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { eventId, name, phoneLast4 } = validation.data;
    const record = await findAttendanceRecord(eventId, name, phoneLast4);

    if (!record) {
      return NextResponse.json(
        { error: "일치하는 체크인 기록이 없습니다. 이름과 연락처 뒷번호를 확인해주세요." },
        { status: 404 }
      );
    }

    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
