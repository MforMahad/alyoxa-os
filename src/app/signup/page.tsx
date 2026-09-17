// src/app/signup/page.tsx

'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'

import {
  Turnstile,
  type TurnstileInstance,
} from '@marsidev/react-turnstile'

import { createClient } from '@/lib/supabase/client'

function getRequiredEnv(
  value: string | undefined,
  name: string
): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }

  return value
}

const siteKey = getRequiredEnv(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY'
)

export default function SignupPage() {
  const supabase = createClient()
  const turnstileRef = useRef<TurnstileInstance>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSignup = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()

    if (isLoading) return

    setError(null)

    /*
     * Read the actual values from the submitted form.
     *
     * This is important for browser password managers and
     * Google-generated passwords because the DOM input value
     * can be populated without React state receiving an
     * onChange event.
     */
    const formData = new FormData(e.currentTarget)

    const emailValue = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase()

    const passwordValue = String(
      formData.get('password') ?? ''
    )

    const confirmPasswordValue = String(
      formData.get('confirmPassword') ?? ''
    )

    /*
     * Validate the actual submitted password value,
     * not the React state value.
     */
    if (passwordValue.length < 12) {
      setError(
        'Password must be at least 12 characters long.'
      )
      return
    }

    if (passwordValue !== confirmPasswordValue) {
      setError(
        'Passwords do not match. Please verify and try again.'
      )
      return
    }

    if (!captchaToken) {
      setError(
        'Please complete the security verification before signing up.'
      )
      return
    }

    if (!emailValue) {
      setError('Please enter your email address.')
      return
    }

    setIsLoading(true)

    try {
      const { error: authError } =
        await supabase.auth.signUp({
          email: emailValue,
          password: passwordValue,
          options: {
            captchaToken,
          },
        })

      if (authError) {
        setError(
          'Unable to create your account. Please try again.'
        )

        setIsLoading(false)
        setCaptchaToken(null)
        turnstileRef.current?.reset()

        return
      }

      setIsLoading(false)

      setCaptchaToken(null)
      turnstileRef.current?.reset()

      /*
       * Keep the submitted email available for the
       * confirmation message.
       */
      setEmail(emailValue)

      setIsSuccess(true)
    } catch {
      setError(
        'An unexpected error occurred. Please try again.'
      )

      setIsLoading(false)
      setCaptchaToken(null)
      turnstileRef.current?.reset()
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6 md:p-12 selection:bg-[var(--primary)]/30">
      <div className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] p-7 md:p-10 shadow-sm">

        {/* Header */}
        <div className="space-y-3 mb-6">
          <div className="font-mono text-[10px] tracking-widest text-[var(--muted)] uppercase">
            ALYOXA OS
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--foreground)] font-[family-name:var(--font-satoshi)]">
            CREATE{' '}
            <span className="font-bold text-[var(--primary)]">
              ACCOUNT.
            </span>
          </h1>

          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Create your ALYOXA OS account.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-4 border border-[var(--primary)]/30 bg-[var(--background)] text-xs text-[var(--foreground)]"
          >
            {error}
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-5">

            <div className="p-5 border border-[var(--primary)]/30 bg-[var(--background)] space-y-3">
              <div className="font-mono text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                CHECK YOUR EMAIL
              </div>

              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                We have sent a verification link to{' '}
                <strong className="font-semibold">
                  {email}
                </strong>
                . Please confirm your email address to complete
                your account setup.
              </p>
            </div>

            <div className="pt-1">
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-between gap-4 px-6 py-3.5 text-xs font-mono tracking-[0.2em] uppercase bg-[var(--primary)] text-[var(--background)] border border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary-soft)] transition-all duration-200 active:scale-[0.99] group select-none"
              >
                <span>RETURN TO LOGIN</span>

                <span className="transition-transform duration-200 transform group-hover:translate-x-1">
                  ↗
                </span>
              </Link>
            </div>

          </div>
        ) : (
          <form
            onSubmit={handleSignup}
            className="space-y-4"
          >

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block font-mono text-[10px] tracking-widest uppercase text-[var(--muted)]"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block font-mono text-[10px] tracking-widest uppercase text-[var(--muted)]"
              >
                Password (12 characters minimum)
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[var(--background)] border border-[var(--border)] px-4 py-3 pr-12 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                  placeholder="••••••••••••"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((visible) => !visible)
                  }
                  disabled={isLoading}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  aria-pressed={showPassword}
                  className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3l18 18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.6 10.6a2 2 0 102.8 2.8"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.9 4.2A10.9 10.9 0 0112 4c5 0 8.7 4 10 8-0.5 1.4-1.3 2.7-2.4 3.8"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.1 6.1C4.5 7.3 3.3 9.1 2 12c.7 2 1.8 3.6 3.3 4.9A10.6 10.6 0 0012 20c1.8 0 3.5-.5 4.9-1.3"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block font-mono text-[10px] tracking-widest uppercase text-[var(--muted)]"
              >
                Confirm password
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  disabled={isLoading}
                  className="w-full bg-[var(--background)] border border-[var(--border)] px-4 py-3 pr-12 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                  placeholder="••••••••••••"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (visible) => !visible
                    )
                  }
                  disabled={isLoading}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                >
                  {showConfirmPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3l18 18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.6 10.6a2 2 0 102.8 2.8"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.9 4.2A10.9 10.9 0 0112 4c5 0 8.7 4 10 8-0.5 1.4-1.3 2.7-2.4 3.8"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.1 6.1C4.5 7.3 3.3 9.1 2 12c.7 2 1.8 3.6 3.3 4.9A10.6 10.6 0 0012 20c1.8 0 3.5-.5 4.9-1.3"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-4 h-4"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Turnstile */}
            <div className="py-1">
              <Turnstile
                ref={turnstileRef}
                siteKey={siteKey}
                onSuccess={(token) => {
                  setCaptchaToken(token)
                  setError(null)
                }}
                onError={() => {
                  setCaptchaToken(null)
                  setError(
                    'Security verification failed. Please try again.'
                  )
                }}
                onExpire={() => {
                  setCaptchaToken(null)
                  setError(
                    'Security verification expired. Please complete the CAPTCHA again.'
                  )
                }}
              />
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading || !captchaToken}
                className="w-full inline-flex items-center justify-between gap-4 px-6 py-3.5 text-xs font-mono tracking-[0.2em] uppercase bg-[var(--primary)] text-[var(--background)] border border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary-soft)] transition-all duration-200 active:scale-[0.99] group disabled:opacity-50 disabled:pointer-events-none select-none"
              >
                <span>
                  {isLoading
                    ? 'SIGNING UP...'
                    : 'CREATE ACCOUNT'}
                </span>

                <span className="transition-transform duration-200 transform group-hover:translate-x-1">
                  ↗
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-[var(--border)]">
          <Link
            href="/login"
            className="text-xs font-mono tracking-wider uppercase text-[var(--primary)] hover:underline block hover:cursor-pointer"
          >
            Already have an account? Sign in ↗
          </Link>
        </div>
      </div>
    </main>
  )
}