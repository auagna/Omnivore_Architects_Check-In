import AdminLogin from "@/components/AdminLogin";

export default function AdminPage() {
  return (
    <main className="safe-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-soft">
            잡식건축가
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white">
            운영진 출석 관리
          </h1>
        </div>
        <AdminLogin />
      </section>
    </main>
  );
}
