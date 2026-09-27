'use client'

import { FormEvent, useMemo, useState } from 'react'

import { connectWebsiteSource } from '@/actions/signal/connectWebsiteSource'
import { updateWorkspaceWebsite } from '@/actions/workspaces/updateWorkspaceWebsite'

import { useWorkspace } from './WorkspaceProvider'

export default function WorkspaceSignalEntry() {
  const { workspace } = useWorkspace()

  const [websiteUrl, setWebsiteUrl] = useState(
    workspace?.website_url ?? ''
  )

  const [savedUrl, setSavedUrl] = useState(
    workspace?.website_url ?? ''
  )

  const [saving, setSaving] = useState(false)
const [signalStatus, setSignalStatus] = useState<
  'waiting' | 'queued' | 'connected'
>('waiting')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isConfigured = Boolean(savedUrl)

  const websiteLabel = useMemo(() => {
    if (!savedUrl) {
      return 'No source connected'
    }

    try {
      return new URL(savedUrl).hostname
    } catch {
      return savedUrl
    }
  }, [savedUrl])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) {
      return
    }

    if (!workspace) {
      setError('No active workspace is available.')
      return
    }

    setMessage('')
    setError('')

    const trimmedUrl = websiteUrl.trim()

    if (!trimmedUrl) {
      setError('Enter your primary website URL.')
      return
    }

    setSaving(true)

    try {
      const updateResult = await updateWorkspaceWebsite({
        workspaceId: workspace.id,
        websiteUrl: trimmedUrl,
      })

      if (!updateResult.success) {
        setError(updateResult.error)
        return
      }

      setWebsiteUrl(updateResult.data.website_url)
      setSavedUrl(updateResult.data.website_url)

      setSignalStatus('queued')
      setMessage('Website saved. Connecting Signal source...')

      const connectResult = await connectWebsiteSource({
        workspaceId: workspace.id,
      })

      if (!connectResult.success) {
        setSignalStatus('waiting')
        setError(connectResult.error)
        setMessage('')
        return
      }

      setSignalStatus('queued')

      setMessage(
        `Signal source connected. Scan ${connectResult.data.scan.status}.`
      )
    } catch {
      setSignalStatus('waiting')
      setError(
        'Something went wrong while connecting the website. Please try again.'
      )
      setMessage('')
    } finally {
      setSaving(false)
    }
  }

  if (!workspace) {
    return null
  }

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)]/30">
      <div className="grid lg:grid-cols-[0.42fr_0.58fr]">
        {/* Editorial intro */}
        <div className="border-b border-[var(--border)] p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-[var(--primary)] uppercase">
              Signal / 01
            </span>

            <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase">
              Primary source
            </span>
          </div>

          <h2 className="mt-6 max-w-lg font-mono text-2xl font-bold leading-[1] tracking-[-0.04em] uppercase sm:text-3xl">
            Give ALYOXA something to understand.
          </h2>

          <p className="mt-5 max-w-lg font-mono text-xs leading-6 text-[var(--muted)]">
            Connect the website that represents this workspace. It becomes
            Signal&apos;s first external source of context.
          </p>

          <div className="mt-8 border-t border-[var(--border)] pt-4">
            <div className="font-mono text-[9px] tracking-[0.14em] text-[var(--muted)] uppercase">
              Workspace
            </div>

            <div className="mt-2 truncate font-mono text-sm font-semibold">
              {workspace.name}
            </div>
          </div>
        </div>

        {/* Website input */}
        <div className="p-6 lg:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
              Primary website
            </div>

            <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] uppercase">
              <span
                className={`h-1.5 w-1.5 ${
                  isConfigured
                    ? 'bg-[var(--primary)]'
                    : 'bg-[var(--muted)]'
                }`}
              />

              {isConfigured ? 'Connected' : 'Not connected'}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6"
          >
            <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="workspace-website"
                  className="mb-2 block font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase"
                >
                  Website URL
                </label>

                <input
                  id="workspace-website"
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => {
                    setWebsiteUrl(event.target.value)
                    setError('')
                    setMessage('')
                  }}
                  placeholder="https://yourcompany.com"
                  maxLength={2048}
                  disabled={saving}
                  autoComplete="url"
                  className="w-full bg-transparent font-mono text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] disabled:opacity-50 sm:text-lg"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !websiteUrl.trim()}
                className="shrink-0 bg-[var(--primary)] px-5 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-[var(--background)] uppercase transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? 'Connecting'
                  : isConfigured
                    ? 'Update'
                    : 'Connect'}{' '}
                ↗
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-4 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-xs leading-5 text-[var(--foreground)]"
              >
                {error}
              </div>
            ) : null}

            {message ? (
              <div
                role="status"
                className="mt-4 border border-[var(--primary)]/30 bg-[var(--surface)] px-4 py-3 font-mono text-xs leading-5 text-[var(--foreground)]"
              >
                {message}
              </div>
            ) : null}
          </form>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border border-[var(--border)] p-4">
              <div className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase">
                Source
              </div>

              <div className="mt-2 truncate font-mono text-xs font-bold uppercase">
                {isConfigured ? websiteLabel : 'Website'}
              </div>
            </div>

            <div className="border border-[var(--border)] p-4">
              <div className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase">
                Signal status
              </div>

              <div className="mt-2 flex items-center gap-2 font-mono text-xs font-bold uppercase">
                <span
                  className={`h-1.5 w-1.5 ${
                    signalStatus === 'waiting'
                      ? 'bg-[var(--muted)]'
                      : 'bg-[var(--primary)]'
                  }`}
                />

                {signalStatus === 'waiting'
                  ? 'Waiting'
                  : signalStatus === 'queued'
                    ? 'Queued'
                    : 'Connected'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}