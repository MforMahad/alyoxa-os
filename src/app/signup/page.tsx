// src/app/login/page.tsx

'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import {
  Turnstile,
  type TurnstileInstance,
} from '@marsidev/react-turnstile'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isLoading) return

    setError(null)

    if (!turnstileSiteKey) {
      setError(
        'Security verification is not configured. Please try again later.'
      )
      return
    }

    setIsLoading(true)

    try {
      /*
       * Read values directly from the submitted form.
       * This also works well with browser password managers
       * and generated passwords.
       */
      const formData = new FormData(e.currentTarget)

      const emailValue = String(formData.get('email') ?? '')
        .trim()
        .toLowerCase()

      const passwordValue = String(formData.get('password') ?? '')

      /*
       * Turnstile must be completed before Supabase Auth
       * will accept the sign-in request.
       */
      if (!captchaToken) {
        setError(
          'Please complete the security verification before signing in.'
        )
        setIsLoading(false)
        return
      }

      if (!emailValue || !passwordValue) {
        setError(
          'Please enter your email address and password.'
        )
        setIsLoading(false)
        return
      }

      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: emailValue,
          password: passwordValue,
          options: {
            captchaToken,
          },
        })

      if (authError) {
        console.error('ALYOXA LOGIN ERROR:', {
          message: authError.message,
          status: authError.status,
          code: authError.code,
        })

        setError(
          "We couldn't sign you in with those credentials. Please check your email and password and try again."
        )

        setCaptchaToken(null)
        turnstileRef.current?.reset()

        setIsLoading(false)
        return
      }

      if (!data.session || !data.user) {
        console.error(
          'ALYOXA LOGIN ERROR: No session/user returned after authentication.'
        )

        setError(
          'We could not establish your session. Please try again.'
        )

        setCaptchaToken(null)
        turnstileRef.current?.reset()

        setIsLoading(false)
        return
      }

      console.log('ALYOXA LOGIN SUCCESS:', {
        userId: data.user.id,
        email: data.user.email,
      })

      router.replace('/app')
      router.refresh()
    } catch (error) {
      console.error('ALYOXA LOGIN UNEXPECTED ERROR:', error)

      setError(
        'Something went wrong while signing you in. Please try again.'
      )

      setCaptchaToken(null)
      turnstileRef.current?.reset()

      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6 md:p-12 selection:bg-[var(--primary)]/30">
      <div className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] p-8 md:p-14 shadow-sm">

        {/* Header */}
        <div className="space-y-4 mb-8">
          <div className="font-mono text-[10px] tracking-widest text-[var(--muted)] uppercase">
            ALYOXA OS
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--foreground)] font-[family-name:var(--font-satoshi)]">
            SIGN{' '}
            <span className="font-bold text-[var(--primary)]">
              IN.
            </span>
          </h1>

          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Enter your email and password to continue.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 border border-[var(--primary)]/30 bg-[var(--background)] text-xs text-[var(--foreground)]"
          >
            {error}
          </div>
        )}

        {/* Login form */}
        <form
          onSubmit={handleLogin}
          className="space-y-5"
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
              placeholder="name@company.com"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block font-mono text-[10px] tracking-widest uppercase text-[var(--muted)]"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
              placeholder="••••••••••••"
            />
          </div>

          {/* Turnstile */}
          <div className="pt-1">
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey ?? ''}
              onSuccess={(token) => {
                setCaptchaToken(token)
                setError(null)
              }}
              onExpire={() => {
                setCaptchaToken(null)
              }}
              onError={() => {
                setCaptchaToken(null)
                setError(
                  'Security verification failed. Please try again.'
                )
              }}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !captchaToken}
              className="w-full inline-flex items-center justify-between gap-4 px-6 py-3.5 text-xs font-mono tracking-[0.2em] uppercase bg-[var(--primary)] text-[var(--background)] border border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary-soft)] transition-all duration-200 active:scale-[0.99] group disabled:opacity-50 disabled:pointer-events-none select-none"
            >
              <span>
                {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              </span>

              <span className="transition-transform duration-200 transform group-hover:translate-x-1">
                ↗
              </span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <Link
            href="/signup"
            className="text-xs font-mono tracking-wider uppercase text-[var(--primary)] hover:underline block hover:cursor-pointer"
          >
            Don&apos;t have an account? Sign up ↗
          </Link>
        </div>

      </div>
    </main>
  )
}