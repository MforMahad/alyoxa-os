'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createWorkspace } from '@/actions/workspaces/createWorkspace'
import { listUserWorkspaces } from '@/actions/workspaces/listUserWorkspaces'
import { setActiveWorkspace } from '@/actions/workspaces/setActiveWorkspace'

function createSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OnboardingPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [checkingWorkspace, setCheckingWorkspace] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const slug = useMemo(() => createSlug(name), [name])

  useEffect(() => {
    let cancelled = false

    async function checkExistingWorkspace() {
      const result = await listUserWorkspaces()

      if (cancelled) {
        return
      }

      if (!result.success) {
        setError(result.error)
        setCheckingWorkspace(false)
        return
      }

      if (result.data.length > 0) {
        router.replace('/app')
        return
      }

      setCheckingWorkspace(false)
    }

    void checkExistingWorkspace()

    return () => {
      cancelled = true
    }
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submitting) {
      return
    }

    setError('')

    const trimmedName = name.trim()
    const trimmedWebsiteUrl = websiteUrl.trim()

    if (trimmedName.length < 2) {
      setError('Workspace name must be at least 2 characters long.')
      return
    }

    if (trimmedName.length > 200) {
      setError('Workspace name is too long.')
      return
    }

    if (slug.length < 2) {
      setError('Please enter a workspace name that produces a valid slug.')
      return
    }

    if (!trimmedWebsiteUrl) {
      setError('Please enter your website URL.')
      return
    }

    setSubmitting(true)

    const result = await createWorkspace({
      name: trimmedName,
      slug,
      websiteUrl: trimmedWebsiteUrl,
    })

    if (!result.success) {
        setError(result.error)
        setSubmitting(false)
        return
      }
      
      const activeWorkspace = await setActiveWorkspace(result.data.id)
      
      if (!activeWorkspace.success) {
        setError(activeWorkspace.error)
        setSubmitting(false)
        return
      }
      
      router.replace('/app')
      router.refresh()
  }

  if (checkingWorkspace) {
    return (
      <main className="min-h-screen bg-[#F0EDE4] text-[#0B1715]">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="text-sm tracking-[0.16em] uppercase text-[#596560]">
            Preparing your workspace
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F0EDE4] text-[#0B1715]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-6 py-6 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-[0.18em] uppercase">
            ALYOXA OS
          </div>

          <div className="text-xs tracking-[0.14em] uppercase text-[#596560]">
            Workspace setup
          </div>
        </header>

        <div className="flex flex-1 items-center py-16 lg:py-24">
          <div className="grid w-full gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
            <section className="flex flex-col justify-center">
              <p className="mb-5 text-xs font-medium tracking-[0.18em] uppercase text-[#336F69]">
                Welcome to ALYOXA OS
              </p>

              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.92] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Set up your workspace.
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-[#596560] sm:text-lg">
                Start with the business you want ALYOXA OS to understand.
                Your website becomes the first piece of workspace context.
              </p>
            </section>

            <section className="flex items-center">
              <div className="w-full max-w-xl">
                <form
                  onSubmit={handleSubmit}
                  className="border border-[#C8C4B8] bg-[#E8E4D9] p-6 sm:p-8 lg:p-10"
                >
                  <div className="space-y-7">
                    <div>
                      <label
                        htmlFor="workspace-name"
                        className="mb-2 block text-xs font-medium tracking-[0.14em] uppercase text-[#596560]"
                      >
                        Workspace name
                      </label>

                      <input
                        id="workspace-name"
                        name="workspaceName"
                        type="text"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value)
                          setError('')
                        }}
                        placeholder="Acme Studio"
                        autoComplete="organization"
                        maxLength={200}
                        disabled={submitting}
                        className="w-full border-b border-[#8E958E] bg-transparent px-0 py-3 text-xl outline-none transition-colors placeholder:text-[#8E958E] focus:border-[#004741] disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="website-url"
                        className="mb-2 block text-xs font-medium tracking-[0.14em] uppercase text-[#596560]"
                      >
                        Website
                      </label>

                      <input
                        id="website-url"
                        name="websiteUrl"
                        type="url"
                        value={websiteUrl}
                        onChange={(event) => {
                          setWebsiteUrl(event.target.value)
                          setError('')
                        }}
                        placeholder="https://acmestudio.com"
                        autoComplete="url"
                        maxLength={2048}
                        disabled={submitting}
                        className="w-full border-b border-[#8E958E] bg-transparent px-0 py-3 text-xl outline-none transition-colors placeholder:text-[#8E958E] focus:border-[#004741] disabled:opacity-60"
                      />
                    </div>

                    <div className="border-t border-[#C8C4B8] pt-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#596560]">
                          Workspace address
                        </span>

                        <span className="truncate text-sm text-[#0B1715]">
                          {slug || 'workspace-slug'}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-[#596560]">
                        Generated automatically from your workspace name.
                      </p>
                    </div>

                    {error ? (
                      <div
                        role="alert"
                        className="border border-[#A9A59A] bg-[#DCD8CC] px-4 py-3 text-sm leading-6 text-[#0B1715]"
                      >
                        {error}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        !name.trim() ||
                        !websiteUrl.trim()
                      }
                      className="flex w-full items-center justify-between bg-[#004741] px-5 py-4 text-sm font-semibold tracking-[0.12em] uppercase text-[#F0EDE4] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>
                        {submitting ? 'Creating workspace' : 'Continue'}
                      </span>

                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}