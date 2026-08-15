import Link from "next/link";

const DEFENCES = [
  {
    title: "Rotating signed codes",
    body: "Each QR carries an HMAC signature and expires after 60 seconds. A forwarded screenshot is dead on arrival.",
  },
  {
    title: "Replay protection",
    body: "Every code is single-use per wallet. Re-submitting a captured payload is rejected.",
  },
  {
    title: "Geofencing",
    body: "Check-ins are compared against the classroom coordinates and refused beyond the configured radius.",
  },
  {
    title: "Time window",
    body: "Attendance is only accepted between the lecture's start time and its deadline.",
  },
  {
    title: "Device binding",
    body: "A wallet is bound to the device it registered on, so a friend cannot mark you present from their phone.",
  },
  {
    title: "On-chain record",
    body: "Each check-in is a Solana account derived from the student and lecture, so duplicates are impossible and records are public.",
  },
];

const ROLES = [
  {
    href: "/register",
    label: "Register",
    body: "Bind your wallet and device to a student record.",
  },
  {
    href: "/professor",
    label: "Professor",
    body: "Open a lecture and project the live code.",
  },
  {
    href: "/student",
    label: "Student",
    body: "Scan the code to check in.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-16 py-6 sm:gap-20 sm:py-10">
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="label">Solana · Anchor · Devnet</p>
        <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-fg sm:text-6xl">
          Attendance that
          <br />
          cannot be proxied
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-fg-muted">
          Rotating signed QR codes, geofencing and device binding, with every verified check-in
          written to Solana as its own account.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/register" className="btn btn-primary px-6 py-3">
            Get started
          </Link>
          <Link href="/professor" className="btn btn-ghost px-6 py-3">
            Run a lecture
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="label">How proxy attendance is blocked</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEFENCES.map((item) => (
            <article key={item.title} className="card flex flex-col gap-2 p-5">
              <h3 className="text-sm text-fg">{item.title}</h3>
              <p className="text-xs leading-relaxed text-fg-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="label">Pick your role</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLES.map((role) => (
            <Link key={role.href} href={role.href} className="card card-interactive p-5">
              <p className="font-display text-sm font-bold tracking-[0.1em] text-fg">
                {role.label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">{role.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
