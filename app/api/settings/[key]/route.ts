import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/attendance";

export const dynamic = "force-dynamic";

const MAX_VALUE_LENGTH = 5000;

type RouteContext = {
  params: Promise<{
    key: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { key } = await context.params;
    return NextResponse.json({ value: await getSetting(key) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const body = (await request.json()) as { value?: unknown };
    const value = String(body?.value ?? "");

    if (value.length > MAX_VALUE_LENGTH) {
      return NextResponse.json({ error: "내용이 너무 깁니다." }, { status: 400 });
    }

    const { key } = await context.params;
    await setSetting(key, value);
    return NextResponse.json({ value });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return NextResponse.json({ error: message }, { status: 500 });
}
