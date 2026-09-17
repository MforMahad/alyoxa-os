// src/app/auth/error/page.tsx
import Link from 'next/link'

export default function AuthErrorPage() {
  const baseStyles =
    'inline-flex items-center justify-between gap-4 px-6 py-3.5 text-xs font-mono tracking-[0.2em] uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] select-none'

  const primaryVariant =
    'bg-[var(--primary)] text-[var(--background)] border border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary-soft)] active:scale-[0.99] group'

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6 md:p-12 selection:bg-[var(--primary-soft)]/30">
      <section className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start bg-[var(--surface)] border border-[var(--border)] p-8 md:p-12 shadow-sm">
        
        {/* Left Column: System Status */}
        <div className="md:col-span-4 space-y-3 border-l border-[var(--border)] pl-4">
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[var(--muted)]">
            // STATUS
          </div>
          <div className="text-sm font-medium tracking-tight text-[var(--primary)]">
            VERIFICATION UNAVAILABLE
          </div>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            The confirmation link could not be verified or has expired.
          </p>
        </div>

        {/* Right Column: Editorial Message & Action */}
        <div className="md:col-span-8 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-[var(--foreground)] font-[family-name:var(--font-satoshi)] leading-none">
              VERIFICATION <br />
              <span className="italic font-normal text-[var(--primary)]">FAILED.</span>
            </h1>
            <p className="text-sm md:text-base text-[var(--muted)] leading-relaxed font-normal">
              The confirmation link could not be verified or has expired. Return to login to request a new verification link.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className={`${baseStyles} ${primaryVariant}`}
            >
              <span>RETURN TO LOGIN</span>
              <span className="transition-transform duration-200 transform group-hover:translate-x-1 font-mono">
                ↗
              </span>
            </Link>
          </div>
        </div>

      </section>
    </main>
  )
}