import AttendanceCount from "@/components/AttendanceCount";
import AttendanceForm from "@/components/AttendanceForm";

type HomePageProps = {
  searchParams?: Promise<{
    eventId?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const eventId = params?.eventId;

  return (
    <main className="safe-screen px-4 py-6 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-soft">
            잡식건축가
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white">
            연사 강연 출석 체크인
          </h1>
          <a className="mt-3 inline-flex text-sm font-semibold text-zinc-300 underline underline-offset-4" href="/admin">
            관리자
          </a>
          <p className="mt-4 text-base font-semibold text-zinc-100">
            연사 강연 프로그램에 오신 것을 환영합니다
          </p>
          <p className="mt-3 text-base leading-7 text-zinc-300">
            아래에서 체크인을 완료해주세요. 이름, 휴대폰 뒷자리 4개, 멤버 또는 게스트 여부만 입력하면 됩니다.
          </p>
        </div>

        <div className="rounded-lg border border-line bg-panel/95 p-5 shadow-glow">
          <AttendanceCount eventId={eventId} />
          <AttendanceForm eventId={eventId} />
        </div>
      </section>
    </main>
  );
}
