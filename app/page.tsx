import CheckInPanel from "@/components/CheckInPanel";
import { getActiveEvent, getEventById } from "@/lib/attendance";
import { PublicEvent } from "@/types/attendance";

type HomePageProps = {
  searchParams?: Promise<{
    eventId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const eventId = params?.eventId;

  let publicEvent: PublicEvent | null = null;

  try {
    const event = eventId ? await getEventById(eventId) : await getActiveEvent();
    // 활성화된 이벤트만 체크인을 받습니다.
    if (event && event.is_active) {
      publicEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        capacity: event.capacity,
        customOptions: event.custom_options
      };
    }
  } catch {
    publicEvent = null;
  }

  return (
    <main className="safe-screen px-4 py-6 sm:px-6 md:px-8">
      <section className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-md flex-col justify-center sm:max-w-lg md:max-w-xl">
        <div className="mb-6 md:mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-soft md:text-base">
            잡식건축가 · Omnivore Architects
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900 md:mt-4 md:text-4xl">
            체크인 <span className="font-medium text-slate-500">/ Check In</span>
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600 md:mt-4 md:text-lg">
            아래에서 체크인을 완료해주세요.
          </p>
        </div>

        <CheckInPanel event={publicEvent} eventId={eventId} />
      </section>
    </main>
  );
}
