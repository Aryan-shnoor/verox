import StatusBadge from "./StatusBadge.jsx";

function Logo() {
  return (
    <div className="flex items-center gap-2.5 text-xl font-bold">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-accent text-base text-white">
        V
      </span>
      Verox
    </div>
  );
}

const samples = [
  { title: "Vendor Contract Review", status: "APPROVED", shifted: true },
  { title: "Budget Plan", status: "DRAFT", shifted: false },
  { title: "Taxation document", status: "DRAFT", shifted: true },
];

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[560px_minmax(0,1fr)]">
      <div className="hidden flex-col bg-accent-soft p-12 lg:flex">
        <Logo />

        <div className="my-auto">
          <h2 className="text-4xl font-bold leading-[1.15] tracking-tight">
            Approvals, without the chasing.
          </h2>
          <p className="mt-3 max-w-sm leading-relaxed text-muted">
            Send documents for review, track every decision and keep your team
            moving.
          </p>

          <div className="mt-9 space-y-2.5" aria-hidden="true">
            {samples.map((sample) => (
              <div
                key={sample.title}
                className={`flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3.5 shadow-sm ${
                  sample.shifted ? "ml-10" : ""
                }`}
              >
                <span className="text-sm font-semibold">{sample.title}</span>
                <StatusBadge status={sample.status} />
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted">
          Verox, document approval and workflow management
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>

          <div className="mt-2">{children}</div>

          <p className="mt-5 text-center text-sm text-muted">{footer}</p>
        </div>
      </div>
    </div>
  );
}
