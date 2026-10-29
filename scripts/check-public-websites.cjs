/* Public fetch/extraction only. Does not import Supabase, read secrets, invoke AI, or write files. */
/* eslint-disable @typescript-eslint/no-require-imports -- This Node CommonJS harness installs a scoped in-memory TypeScript require hook. */
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '../src/lib/os/signal')
require.extensions['.ts'] = (module, filename) => {
  if (!filename.startsWith(root + path.sep)) throw new Error('Smoke test attempted to load a module outside the scanner helpers.')
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  module._compile(output, filename)
}
const { fetchWebsiteHtml } = require('../src/lib/os/signal/websiteFetch.ts')
const { parseWebsiteUrl } = require('../src/lib/os/signal/websiteScanUtils.ts')
const { analyzeWebsiteHtml } = require('../src/lib/os/signal/websiteIntelligence.ts')
async function main() {
  const urls = process.argv.slice(2)
  if (!urls.length) throw new Error('Pass one or more public HTTP(S) URLs. There are no built-in target domains.')
  for (const input of urls) {
    const started = Date.now()
    try {
      const result = await fetchWebsiteHtml(parseWebsiteUrl(input))
      const measured = analyzeWebsiteHtml(result.body.toString('utf8'), result.finalUrl, result.headers)
      console.log(JSON.stringify({ input, status: 'fetched', finalUrl: result.finalUrl.toString(), httpStatus: result.statusCode,
        bytes: result.body.length, durationMs: Date.now() - started, evidence: measured.evidence, limitations: measured.limitations }))
    } catch (error) {
      console.log(JSON.stringify({ input, status: 'unavailable', reason: error.message, durationMs: Date.now() - started }))
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
