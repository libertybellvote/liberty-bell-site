// Liberty Bell — automated model session.
// Runs on GitHub's own servers via GitHub Actions, on a schedule. Does not
// depend on any laptop, desktop app, browser, or connector being open.

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'site-data.json');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-5';

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable. Add it as a repo secret.');
  process.exit(1);
}

async function fetchPolymarketSnapshot() {
  const slugs = [
    'which-party-wins-2028-us-presidential-election',
    'democratic-presidential-nominee-2028',
    'republican-presidential-nominee-2028',
  ];
  const results = {};
  for (const slug of slugs) {
    try {
      const res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        results[slug] = data;
      }
    } catch (err) {
      console.warn(`Could not fetch Polymarket slug "${slug}":`, err.message);
    }
  }
  return results;
}

async function runModelSession(currentData, marketSnapshot) {
  const systemPrompt = `You are running a scheduled analysis session for Liberty Bell, an independent 2028 presidential election forecasting site. You update the site's data file directly — your output is read by code, not a person, so it must be valid JSON matching the exact schema you're given, nothing else.

Liberty Bell's model weighs nine inputs for every call: polling (head-to-head and primary), live betting market odds, campaign fundamentals (fundraising, ground game, endorsements), candidate quality (experience, communication, debate performance), coalition strength and durability, social sentiment, momentum, economic backdrop, and fragility/insurgency positioning (each candidate's single point of failure, and whether they're running as an outsider or an institutional figure in their own party).

Rules:
- Never invent a specific number (like a poll result or odds figure) you can't reasonably source from real knowledge or the market snapshot provided. If you don't have real data for something, leave it unchanged rather than guessing.
- Write in Liberty Bell's voice: direct, no em dashes, willing to disagree with the market and say so explicitly, willing to say when you're genuinely unsure between two outcomes.
- Only change fields that genuinely need to change based on new information. Leave everything else exactly as it was.
- Watch specifically for candidate statements about potential running mates, tickets, or alliances — these are real coalition signal, not just gossip, and should be reflected (clearly labeled as speculation) in the relevant candidates' "pulse" or "audience" fields.
- Update "lastUpdated" to the current timestamp in ISO 8601 format.
- Return ONLY the complete updated JSON object, matching the exact same structure as the input. No markdown formatting, no code fences, no commentary before or after.`;

  const userPrompt = `Current site-data.json:
${JSON.stringify(currentData, null, 2)}

Live Polymarket snapshot (best-effort, may be incomplete):
${JSON.stringify(marketSnapshot, null, 2)}

Run today's Liberty Bell analysis session using the nine-lens model. Check current political news, social sentiment, and market movement for all tracked 2028 candidates. Return the complete updated site-data.json.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const textBlocks = data.content.filter(b => b.type === 'text').map(b => b.text);
  const rawText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].trim() : '';

  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let updated;
  try {
    updated = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Model response was not valid JSON. Got ${textBlocks.length} text block(s) in the response. Last block, first 500 chars:\n${cleaned.slice(0, 500)}`);
  }

  return updated;
}

function validateShape(data) {
  const requiredKeys = ['lastUpdated', 'libertyBellIndex', 'field', 'thirdParty', 'calls', 'calendar', 'powerRanking'];
  for (const key of requiredKeys) {
    if (!(key in data)) {
      throw new Error(`Model output is missing required key: "${key}". Refusing to write a malformed file.`);
    }
  }
  if (!Array.isArray(data.field.democratic) || data.field.democratic.length === 0) {
    throw new Error('Model output has an empty or malformed democratic field list. Refusing to write.');
  }
  if (!Array.isArray(data.field.republican) || data.field.republican.length === 0) {
    throw new Error('Model output has an empty or malformed republican field list. Refusing to write.');
  }
  if (!Array.isArray(data.calls) || data.calls.length === 0) {
    throw new Error('Model output has an empty or malformed calls list. Refusing to write.');
  }
}

async function main() {
  console.log('Reading current site-data.json...');
  const currentData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  console.log('Fetching live Polymarket snapshot...');
  const marketSnapshot = await fetchPolymarketSnapshot();

  console.log('Running Liberty Bell model session via Claude API...');
  const updated = await runModelSession(currentData, marketSnapshot);

  console.log('Validating model output before writing...');
  validateShape(updated);

  fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2));
  console.log('site-data.json updated successfully.');
}

main().catch(err => {
  console.error('Model session failed:', err.message);
  process.exit(1);
});
