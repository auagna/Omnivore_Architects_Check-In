import { NextResponse } from "next/server";
import { verifyAdminPin } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!await verifyAdminPin(body?.pin)) return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
}
