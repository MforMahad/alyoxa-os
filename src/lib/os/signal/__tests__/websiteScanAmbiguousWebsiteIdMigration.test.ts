import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readMigration = (name: string) => readFileSync(resolve(process.cwd(), 'supabase/migrations', name), 'utf8').replace(/\r\n/g, '\n')
const baseline = readMigration('20261006000300_enforce_website_scan_integrity.sql')
const migration = readMigration('20261029000100_fix_connect_website_signal_source_ambiguous_website_id.sql')
const extractFunction = (sql: string) => {
  const definition = sql.match(/CREATE OR REPLACE FUNCTION public\.connect_website_signal_source\([\s\S]*?\n\$\$;/)?.[0]
  if (!definition) throw new Error('Expected connection function definition')
  return definition
}

describe('connect website source 42702 forward migration', () => {
  it('changes only the confirmed ambiguous conflict clause in the tracked definition', () => {
    const previous = extractFunction(baseline)
    const conflict = "ON CONFLICT (website_id)\n        WHERE status IN ('queued', 'processing')\n        DO NOTHING;"
    expect(previous.split(conflict)).toHaveLength(2)
    expect(extractFunction(migration)).toBe(previous.replace(conflict, 'ON CONFLICT DO NOTHING;'))
  })

  it('replaces the function transactionally without dropping it or changing grants/schema', () => {
    const statements = migration.replace(/^--.*$/gm, '').trim()
    expect(statements.startsWith('BEGIN;')).toBe(true)
    expect(statements.endsWith('COMMIT;')).toBe(true)
    expect(statements).not.toMatch(/\b(?:DROP|GRANT|REVOKE|ALTER)\b|CREATE\s+(?:UNIQUE\s+)?(?:INDEX|TABLE|POLICY)/i)
    expect(statements.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(1)
    expect(extractFunction(migration)).toContain('SECURITY INVOKER\nSET search_path = public')
  })

  it('leaves no ambiguous output parameter references in executable expressions', () => {
    const definition = extractFunction(migration)
    const returns = definition.match(/RETURNS TABLE \(([\s\S]*?)\n\)/)?.[1]
    if (!returns) throw new Error('Expected RETURNS TABLE declaration')
    const outputNames = [...returns.matchAll(/^\s*(\w+)\s+/gm)].map(match => match[1])
    expect(outputNames).toEqual(['source_id', 'source_public_id', 'website_id', 'website_public_id', 'scan_id', 'scan_public_id', 'scan_status'])
    const body = definition.split('AS $$\n')[1]
      // INSERT target-column names are syntactically columns, not PL/pgSQL expressions.
      .replace(/INSERT INTO public\.\w+\s*\([\s\S]*?\)/g, '')
    for (const name of outputNames) {
      expect(body).not.toMatch(new RegExp(`(?<![\\w.])${name}(?!\\w)`, 'g'))
    }
    expect(definition).toMatch(/INSERT INTO public\.website_scans[\s\S]*?ON CONFLICT DO NOTHING;/)
    expect(definition).not.toContain('ON CONFLICT (website_id)')
  })
})
