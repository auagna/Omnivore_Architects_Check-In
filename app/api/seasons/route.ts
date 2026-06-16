import { NextResponse } from "next/server";
import { createSeason, listSeasons } from "@/lib/attendance";
import { validateSeasonPayload } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ seasons: await listSeasons() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateSeasonPayload(body?.season);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    return NextResponse.json({ season: await createSeason(validation.data) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return NextResponse.json({ error: message }, { status: 500 });
}
