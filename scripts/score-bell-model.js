// The Bell Model: deterministic nine-signal scoring and call engine.
// Scores are bounded from -1 (Republican disadvantage / candidate weakness)
// to +1 (Democratic advantage / candidate strength). Market prices are one
// input, never the call itself.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'site-data.json');
const CONFIG_PATH = path.join(ROOT, 'model-config.json');
const INPUTS_PATH = path.join(ROOT, 'model-inputs.json');
const EVIDENCE_PATH = path.join(ROOT, 'evidence-ledger.json');
const LEDGER_PATH = path.join(ROOT, 'ledger.json');
const STATE_PATH = path.join(ROOT, 'model-state.json');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, places = 1) => Number(value.toFixed(places));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function presidentialScores(data, config, inputs) {
  const scores = {};
  const inputAgeHours = (Date.now() - new Date(inputs.updatedAt).getTime()) / 36e5;
  const reviewedInputsCurrent = Number.isFinite(inputAgeHours) && inputAgeHours <= config.maximumAgeHours;
  for (const key of Object.keys(config.factors)) {
    if (key === 'bettingMarkets') {
      const market = Number(data.marketMeta?.partyIndex?.democratic);
      const marketAgeHours = (Date.now() - new Date(data.marketMeta?.retrievedAt).getTime()) / 36e5;
      if (Number.isFinite(market) && Number.isFinite(marketAgeHours) && marketAgeHours <= 24) scores[key] = clamp((market - 50) / 50, -1, 1);
    } else if (reviewedInputsCurrent && Number.isFinite(Number(inputs.presidential?.[key]?.score))) {
      scores[key] = clamp(Number(inputs.presidential[key].score), -1, 1);
    }
  }
  return scores;
}

function weightedScore(scores, config) {
  let weighted = 0;
  let weight = 0;
  for (const [key, value] of Object.entries(scores)) {
    const factorWeight = Number(config.factors[key]?.weight || 0);
    weighted += value * factorWeight;
    weight += factorWeight;
  }
  return { value: weight ? weighted / weight : 0, weight };
}

function callLabel(democratic) {
  if (democratic >= 65) return 'Likely Democratic';
  if (democratic >= 55) return 'Leans Democratic';
  if (democratic > 52) return 'Tilts Democratic';
  if (democratic >= 48) return 'Toss-up';
  if (democratic > 45) return 'Tilts Republican';
  if (democratic > 35) return 'Leans Republican';
  return 'Likely Republican';
}

function normalizedCandidateMetric(list, field) {
  const values = list.map(candidate => Math.max(0, Number(candidate[field]) || 0));
  const max = Math.max(...values, 1);
  return new Map(list.map((candidate, index) => [clean(candidate.name), values[index] / max]));
}

function scoreCandidates(list, config, inputs) {
  const market = normalizedCandidateMetric(list, 'oddsNum');
  const polling = normalizedCandidateMetric(list, 'pollAvg');
  return list.map(candidate => {
    const editorial = inputs.candidates?.[candidate.name];
    if (!editorial) return null;
    const scores = {
      polling: polling.get(clean(candidate.name)) || 0,
      bettingMarkets: market.get(clean(candidate.name)) || 0,
      campaignFundamentals: editorial.campaignFundamentals,
      candidateQuality: editorial.candidateQuality,
      coalitionStrength: editorial.coalitionStrength,
      socialSentiment: editorial.socialSentiment,
      momentum: editorial.momentum,
      economicBackdrop: editorial.economicBackdrop,
      fragility: editorial.fragility
    };
    const result = weightedScore(scores, config);
    return { name: candidate.name, score: round(result.value * 100, 1), factors: scores };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

function findCall(data, pattern) {
  return data.calls.find(call => pattern.test(call.question));
}

function appendChange(ledger, timestamp, type, label, previous, value, note, factors) {
  ledger.push({ timestamp, modelVersion: '3.0', type, label, previous, value, source: 'The Bell Model', note, factors });
}

function main() {
  const data = readJson(DATA_PATH);
  const config = readJson(CONFIG_PATH);
  const inputs = readJson(INPUTS_PATH);
  const evidence = readJson(EVIDENCE_PATH);
  const previous = readJson(STATE_PATH);
  const ledger = readJson(LEDGER_PATH);
  const timestamp = new Date().toISOString();

  const scores = presidentialScores(data, config, inputs);
  const coverage = Object.keys(scores).length;
  if (coverage < config.minimumCurrentFactors) {
    console.log(`The Bell Model frozen: ${coverage}/${config.minimumCurrentFactors} required signals available.`);
    return;
  }

  const presidential = weightedScore(scores, config);
  const democratic = round(clamp(50 + presidential.value * 25, 0, 100));
  const republican = round(100 - democratic);
  const presidentialCall = callLabel(democratic);
  const demRank = scoreCandidates(data.field.democratic, config, inputs);
  const repRank = scoreCandidates(data.field.republican, config, inputs);
  if (!demRank.length || !repRank.length) throw new Error('Candidate ratings are missing');

  const presidentialCard = findCall(data, /which party wins/i);
  const demCard = findCall(data, /Democratic nomination/i);
  const repCard = findCall(data, /Republican nomination/i);
  const demPick = demRank[0].name;
  const repPick = repRank[0].name;
  const displayName = name => name === 'Alexandria Ocasio-Cortez' ? 'AOC' : name.split(' ').at(-1);

  data.libertyBellIndex = { democratic, republican };
  presidentialCard.ourCall = presidentialCall;
  presidentialCard.partySeal = democratic >= 50 ? 'd' : 'r';
  demCard.pickName = demPick;
  repCard.pickName = repPick;
  demCard.ourCall = `${displayName(demPick)}, carefully`;
  repCard.ourCall = repRank[1] ? `${displayName(repPick)}, with ${displayName(repRank[1].name)} closing` : displayName(repPick);
  if (previous.presidentialCall !== presidentialCall) presidentialCard.whyShort = `The full nine-signal score now puts the race at D ${democratic}% and R ${republican}%.`;
  if (previous.democraticPick !== demPick) demCard.whyShort = `${demPick} moved to the top of The Bell Model's weighted Democratic field.`;
  if (previous.republicanPick !== repPick) repCard.whyShort = `${repPick} moved to the top of The Bell Model's weighted Republican field.`;
  data.modelUpdatedAt = timestamp;
  data.modelMeta = {
    version: '3.0',
    updatedAt: timestamp,
    status: 'scored',
    signalCoverage: `${coverage}/9`,
    score: round(presidential.value * 100, 1),
    factors: Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, { score: round(score, 3), weight: config.factors[key].weight }])),
    nominationRankings: { democratic: demRank, republican: repRank },
    evidenceUpdatedAt: evidence.updatedAt
  };

  evidence.modelVersion = '3.0';
  evidence.callStatus = 'scored';
  evidence.coverage.currentFactors = coverage;
  for (const [key, factor] of Object.entries(evidence.factors || {})) {
    if (Number.isFinite(scores[key])) {
      factor.status = 'scored';
      factor.score = round(scores[key], 3);
      factor.note = key === 'bettingMarkets' ? 'Calculated from current separately labeled market prices.' : 'Scored from the current reviewed Bell Model input.';
    }
  }

  const oldD = Number(previous.libertyBellIndex?.democratic);
  if (Number.isFinite(oldD) && Math.abs(democratic - oldD) >= 0.5) {
    appendChange(ledger, timestamp, 'bell-index', 'Bell direction', `D ${oldD}% / R ${100 - oldD}%`, `D ${democratic}% / R ${republican}%`, 'The weighted nine-signal score moved by at least half a point.', scores);
  }
  if (previous.presidentialCall !== presidentialCall) appendChange(ledger, timestamp, 'presidential-call', 'Presidential call', previous.presidentialCall, presidentialCall, 'The Bell crossed a published call threshold.', scores);
  if (previous.democraticPick !== demPick) appendChange(ledger, timestamp, 'democratic-nominee', 'Democratic nominee pick', previous.democraticPick, demPick, 'The candidate moved to the top of the weighted nomination score.', demRank[0].factors);
  if (previous.republicanPick !== repPick) appendChange(ledger, timestamp, 'republican-nominee', 'Republican nominee pick', previous.republicanPick, repPick, 'The candidate moved to the top of the weighted nomination score.', repRank[0].factors);

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  fs.writeFileSync(EVIDENCE_PATH, JSON.stringify(evidence, null, 2) + '\n');
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger.slice(-500), null, 2) + '\n');
  fs.writeFileSync(STATE_PATH, JSON.stringify({ libertyBellIndex: data.libertyBellIndex, presidentialCall, democraticPick: demPick, republicanPick: repPick, modelUpdatedAt: timestamp }, null, 2) + '\n');
  console.log(`The Bell Model scored D ${democratic}% / R ${republican}%; picks: ${demPick} and ${repPick}.`);
}

try { main(); } catch (error) { console.error('The Bell Model frozen:', error.message); process.exit(1); }
