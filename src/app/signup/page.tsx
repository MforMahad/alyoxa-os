// src/app/signup/page.tsx
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

function getRequiredEnv(value: string | undefined, name: string): string {
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isLoading) return

    setError(null)

    if (password.length < 12) {
      setError('Password must be at least 12 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.')
      return
    }

    if (!captchaToken) {
      setError('Please complete the security verification before signing up.')
      return
    }

    setIsLoading(true)

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
        },
      })

      if (authError) {
        setError('Unable to create your account. Please try again.')
        setIsLoading(false)
        setCaptchaToken(null)
        turnstileRef.current?.reset()
        return
      }

      setIsLoading(false)
      setCaptchaToken(null)
      turnstileRef.current?.reset()
      setIsSuccess(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
      setCaptchaToken(null)
      turnstileRef.current?.reset()
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6 md:p-12 selection:bg-[var(--primary)]/30">
      <div className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] p-8 md:p-14 shadow-sm">
        
        {/* Header Section */}
        <div className="space-y-4 mb-8">
          <div className="font-mono text-[10px] tracking-widest text-[var(--muted)] uppercase">
            ALYOXA OS
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--foreground)] font-[family-name:var(--font-satoshi)]">
            CREATE <span className="font-bold text-[var(--primary)]">ACCOUNT.</span>
          </h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Create your ALYOXA OS account.
          </p>
        </div>

        {error && (
          <div 
            role="alert" 
            className="mb-6 p-4 border border-[var(--primary)]/30 bg-[var(--background)] text-xs text-[var(--foreground)]"
          >
            {error}
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-6">
            <div className="p-6 border border-[var(--primary)]/30 bg-[var(--background)] space-y-3">
              <div className="font-mono text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                CHECK YOUR EMAIL
              </div>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                We have sent a verification link to <strong className="font-semibold">{email}</strong>. Please confirm your email address to complete your account setup.
              </p>
            </div>

            <div className="pt-2">
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
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block font-mono text-[10px] tracking-widest uppercase text-[var(--muted)]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label 
                htmlFor="password" 
                className="block font-mono text-[10px] tracking-widest uppercase text-[var(--muted)]"
              >
                Password (12 characters minimum)
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                placeholder="••••••••••••"
              />
            </div>

            <div className="space-y-2">
              <label 
                htmlFor="confirmPassword" 
                className="block font-mono text-[10px] tracking-widest uppercase text-[var(--muted)]"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[var(--background)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
                placeholder="••••••••••••"
              />
            </div>

            {/* Turnstile Widget */}
            <div className="py-2">
              <Turnstile
                ref={turnstileRef}
                siteKey={siteKey}
                onSuccess={(token) => {
                  setCaptchaToken(token)
                  setError(null)
                }}
                onError={() => {
                  setCaptchaToken(null)
                  setError('Security verification failed. Please try again.')
                }}
                onExpire={() => {
                  setCaptchaToken(null)
                  setError('Security verification expired. Please complete the CAPTCHA again.')
                }}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !captchaToken}
                className="w-full inline-flex items-center justify-between gap-4 px-6 py-3.5 text-xs font-mono tracking-[0.2em] uppercase bg-[var(--primary)] text-[var(--background)] border border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:border-[var(--primary-soft)] transition-all duration-200 active:scale-[0.99] group disabled:opacity-50 disabled:pointer-events-none select-none"
              >
                <span>{isLoading ? 'SIGNING UP...' : 'CREATE ACCOUNT'}</span>
                <span className="transition-transform duration-200 transform group-hover:translate-x-1">
                  ↗
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Link */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
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