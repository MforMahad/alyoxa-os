import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20261006000300_enforce_website_scan_integrity.sql'
  ),
  'utf8'
)
const websiteIdentityMigration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20261006000400_enforce_website_canonical_identity.sql'
  ),
  'utf8'
)
const websiteSchemaMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260916000600_create_websites.sql'),
  'utf8'
)

describe('website scan integrity migration contract', () => {
  it('runs the migration lock and all DDL/DML inside one transaction', () => {
    expect(migration.trimStart().startsWith('BEGIN;')).toBe(true)
    expect(migration.trimEnd().endsWith('COMMIT;')).toBe(true)
    expect(migration.indexOf('BEGIN;')).toBeLessThan(
      migration.indexOf('LOCK TABLE public.websites')
    )
    expect(migration.lastIndexOf('COMMIT;')).toBeGreaterThan(
      migration.indexOf('LOCK TABLE public.websites')
    )
  })

  it('enforces at most one queued or processing scan per website', () => {
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX idx_website_scans_one_active_per_website\s+ON public\.website_scans \(website_id\)\s+WHERE status IN \('queued', 'processing'\)/
    )
    expect(migration).toMatch(
      /ON CONFLICT \(website_id\)\s+WHERE status IN \('queued', 'processing'\)\s+DO NOTHING/
    )
  })

  it('keeps terminal scans outside active reuse and preserves historical scan rows', () => {
    const activeLookup = migration.match(
      /SELECT scan\.id, scan\.public_id, scan\.status[\s\S]*?LIMIT 1;/
    )?.[0]

    expect(activeLookup).toContain("scan.status IN ('queued', 'processing')")
    expect(activeLookup).not.toContain("'completed'")
    expect(activeLookup).not.toContain("'failed'")
    expect(migration).toMatch(
      /WHERE scan\.status IN \('queued', 'processing'\)[\s\S]*?UPDATE public\.website_scans AS scan/
    )
    expect(migration).toMatch(/'standard',\s*'queued'/)
    expect(migration).toMatch(
      /UPDATE public\.website_scans AS scan[\s\S]*?status = 'failed'[\s\S]*?Marked failed by website scan integrity migration/
    )
    expect(migration).not.toMatch(/DELETE\s+FROM public\.website_scans/i)
  })

  it('does not alter RLS policies or scan insert privileges', () => {
    expect(migration).not.toMatch(/CREATE POLICY|DROP POLICY|ALTER POLICY|REVOKE .*website_scans/i)
    expect(migration).toContain('SECURITY INVOKER')
  })

  it('enforces canonical website identity on direct inserts and updates', () => {
    expect(websiteIdentityMigration).toContain('SECURITY INVOKER')
    expect(websiteIdentityMigration).toMatch(
      /FROM public\.canonicalize_website_url\(NEW\.entry_url\)/
    )
    expect(websiteIdentityMigration).toMatch(
      /IF NEW\.normalized_domain IS DISTINCT FROM v_normalized_domain THEN[\s\S]*?RAISE EXCEPTION/
    )
    expect(websiteIdentityMigration).toContain(
      "NEW.entry_url := v_scheme || '://' || v_normalized_domain || '/';"
    )
    expect(websiteIdentityMigration).toMatch(
      /BEFORE INSERT OR UPDATE\s+ON public\.websites/
    )
    expect(websiteIdentityMigration).not.toMatch(
      /CREATE POLICY|DROP POLICY|ALTER POLICY|ALTER TABLE/i
    )
  })

  it('preserves workspace-scoped domain uniqueness and isolation', () => {
    expect(websiteSchemaMigration).toMatch(
      /CONSTRAINT unq_workspace_normalized_domain UNIQUE \(workspace_id, normalized_domain\)/
    )
    expect(websiteIdentityMigration).not.toMatch(/DROP CONSTRAINT|DROP INDEX/i)
  })
})