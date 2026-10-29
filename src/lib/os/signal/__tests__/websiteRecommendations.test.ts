import { recommendWebsiteImprovements } from '../websiteRecommendations'

const evidence = [{ id: 'title', label: 'HTML title', value: '' }]
const priorKey = process.env.OPENAI_API_KEY, priorModel = process.env.OPENAI_WEBSITE_MODEL
beforeEach(() => { process.env.OPENAI_API_KEY = 'test-only'; process.env.OPENAI_WEBSITE_MODEL = 'configured-model' })
afterEach(() => {
  if (priorKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = priorKey
  if (priorModel === undefined) delete process.env.OPENAI_WEBSITE_MODEL; else process.env.OPENAI_WEBSITE_MODEL = priorModel
  jest.restoreAllMocks()
})
function provider(recommendations: unknown, status = 'completed') {
  return jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status, output: [{ content: [{ type: 'output_text', text: JSON.stringify({ recommendations }) }] }] }) })
}
it('reports missing configuration without fabricating or calling a provider', async () => {
  delete process.env.OPENAI_API_KEY
  const request = provider([])
  expect((await recommendWebsiteImprovements(evidence, [], false, request)).status).toBe('unavailable')
  expect(request).not.toHaveBeenCalled()
})
it('honors page exclusions before sending evidence', async () => {
  const request = provider([])
  expect((await recommendWebsiteImprovements(evidence, [], true, request)).status).toBe('excluded')
  expect(request).not.toHaveBeenCalled()
})
it('uses the actual configured model and retains validated evidence references', async () => {
  const recommendations = [{ recommendation: 'Add a descriptive title.', evidenceIds: ['title'], caveat: 'Only the fetched page was checked.' }]
  const request = provider(recommendations)
  expect(await recommendWebsiteImprovements(evidence, ['One page only'], false, request)).toMatchObject({ status: 'available', model: 'configured-model', recommendations })
  const body = JSON.parse(request.mock.calls[0][1].body)
  expect(body).toMatchObject({ model: 'configured-model', store: false, text: { format: { type: 'json_schema', strict: true } } })
  expect(body.input).toContain('One page only')
})
it.each([
  [{ recommendation: 'Claim an unmeasured score', evidenceIds: ['invented-score'], caveat: '' }],
  [{ recommendation: 'No citations', evidenceIds: [], caveat: '' }],
  [null],
])('rejects unsupported or invalid model output: %j', async recommendations => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  expect((await recommendWebsiteImprovements(evidence, [], false, provider(recommendations))).status).toBe('error')
})
it('reports provider failure without failing the measured scan', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  expect((await recommendWebsiteImprovements(evidence, [], false, jest.fn().mockRejectedValue(new Error('Timeout')))).status).toBe('error')
})
