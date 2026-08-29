import Link from "next/link";

export function Logo() {
  return (
    <Link href="/overview" className="app-logo">
      <span className="app-logo-mark">P</span>
      <span>
        <span className="app-logo-kicker">Peak</span>
        <span className="app-logo-name">Kapasite Takip</span>
      </span>
    </Link>
  );
}
