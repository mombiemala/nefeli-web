import { AppNav } from "./app-nav";

/** Wraps authenticated pages with the nav + consistent padding. */
export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen md:pl-60">
      <AppNav />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 md:px-8 md:pb-12">
        {title && (
          <header className="mb-6 animate-fade-up">
            <h1 className="heading text-3xl md:text-4xl">{title}</h1>
            {subtitle && <p className="subtle mt-1">{subtitle}</p>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
