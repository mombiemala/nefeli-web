import Link from "next/link";

// The NEFELI wordmark with a small twinkling star — used on the landing and
// auth surfaces so the brand feels consistent from the first screen.
export function Wordmark({
  href = "/",
  className = "",
}: {
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-accent animate-twinkle" aria-hidden>
        ✦
      </span>
      <span className="text-sm font-semibold tracking-[0.25em] text-neutral-200">
        NEFELI
      </span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="inline-flex" aria-label="NEFELI home">
      {inner}
    </Link>
  );
}
