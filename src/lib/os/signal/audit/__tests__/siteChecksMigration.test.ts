import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const base = readFileSync(resolve(process.cwd(), 'supabase/migration-drafts/20261029001000_website_audit_phase1.sql'), 'utf8').replace(/\r\n/g, '\n')
const sql = readFileSync(resolve(process.cwd(), 'supabase/migration-drafts/20261104001000_website_site_checks.sql'), 'utf8').replace(/\r\n/g, '\n')

// These are source-contract checks, not PostgreSQL execution or concurrency tests.
it('uses a PostgreSQL-compatible regex and filters overlong references before budgets and limits', () => {
  expect(sql).not.toContain('{1,2048}')
  expect(sql).toContain('(https?://[^[:space:]]+)')
  expect(sql).toContain('WHERE char_length(m[1])<=2048\n      LIMIT 10')
  expect(sql).toContain(') refs WHERE bytes<=8000;')
})

it.each([
  ['claim_website_audit_page', false], ['finish_website_audit_page', false],
  ['claim_website_quick_scan', true], ['finish_website_quick_scan', true],
] as const)('preserves the existing %s algorithm except the reviewed resource hooks', (name, quick) => {
  let expected = base.match(new RegExp('CREATE FUNCTION public\\.' + name + '\\([\\s\\S]*?\\n\\$\\$;'))![0].replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION')
  if (name.startsWith('claim')) {
    const start = expected.lastIndexOf('  RETURN jsonb_build_object(')
    const end = expected.indexOf(';', start)
    expected = expected.slice(0, start) + '  RETURN public.prepare_website_site_checks(' + expected.slice(start + '  RETURN '.length, end) + ',' + quick + ');' + expected.slice(end + 1)
  } else {
    const marker = quick ? "  v_status:='queued';" : "  v_reason := left(p_result->>'reason', 300);"
    expected = expected.replace(marker, () => `  p_result:=public.record_website_site_check(${quick ? 'v_s.id' : 'v_a.id'},p_lease_token,p_result,${quick});\n` +
      (quick ? "  -- Match the helper's row update in the already-loaded retry-budget snapshot.\n  IF v_kind='site_resource' THEN v_q.attempts:=greatest(0,v_q.attempts-1); END IF;\n" : '') +
      "  v_kind:=p_result->>'kind';\n" + marker)
    expect(expected.indexOf('last_result_token')).toBeLessThan(expected.indexOf('p_result:=public.record_website_site_check'))
    expect(expected.indexOf(quick ? "'QUICK_STALE_HOST_LEASE'" : "'AUDIT_STALE_HOST_LEASE'")).toBeLessThan(expected.indexOf('p_result:=public.record_website_site_check'))
  }
  const actual = sql.match(new RegExp('CREATE OR REPLACE FUNCTION public\\.' + name + '\\([\\s\\S]*?\\n\\$\\$;'))![0]
  expect(actual).toBe(expected)
})

it('defaults checks off and keeps cache mutations private without modifying retained observations', () => {
  expect(sql).toContain('site_checks_enabled BOOLEAN NOT NULL DEFAULT false')
  expect(sql).toContain('FROM PUBLIC,anon,authenticated,service_role')
  expect(sql).not.toMatch(/(?:UPDATE|DELETE FROM) public\.signal_observations/)
  expect(sql).not.toMatch(/GRANT.*(?:INSERT|UPDATE|DELETE|ALL)/)
  expect(sql).toContain("interval '24 hours'")
  expect(sql).toContain("EXIT; -- At most one same-origin declaration")
  expect(sql).toContain("attempts=greatest(0,attempts-1)")
  expect(sql).toContain("site_resource_check','delay_ms',2000")
})
