import { NextResponse } from "next/server";
import { deleteEvent, updateEvent } from "@/lib/attendance";
import { validateEventPayload } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const body = await request.json();

    const validation = validateEventPayload(body?.event);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { id } = await context.params;
    return NextResponse.json({ event: await updateEvent(id, validation.data) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteEvent(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return NextResponse.json({ error: message }, { status: 500 });
}
