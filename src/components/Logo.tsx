import Link from "next/link";

export function Logo() {
  return (
    <Link href="/overview" className="block">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Peak
      </p>
      <p className="text-sm font-bold leading-tight text-slate-900">
        Kapasite Takip
      </p>
    </Link>
  );
}
