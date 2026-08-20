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
const HISTORY_PATH = path.join(ROOT, 'race-history.json');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, places = 1) => Number(value.toFixed(places));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function presidentialScores(data, config, inputs) {
  const scores = {};
  for (const key of Object.keys(config.factors)) {
    if (key === 'bettingMarkets') {
      const market = Number(data.marketMeta?.partyIndex?.democratic);
      const marketAgeHours = (Date.now() - new Date(data.marketMeta?.retrievedAt).getTime()) / 36e5;
      if (Number.isFinite(market) && Number.isFinite(marketAgeHours) && marketAgeHours <= 24) scores[key] = clamp((market - 50) / 50, -1, 1);
    } else if (key === 'polling' && Number.isFinite(Number(data.nationalPolling?.genericBallotDemocratic))) {
      const genericMargin = Number(data.nationalPolling.genericBallotDemocratic) - Number(data.nationalPolling.genericBallotRepublican);
      const approvalDrag = Number(data.nationalPolling.trumpDisapproval) - Number(data.nationalPolling.trumpApproval);
      scores[key] = clamp(genericMargin / 20 * .65 + approvalDrag / 30 * .35, -1, 1);
    } else if (Number.isFinite(Number(inputs.presidential?.[key]?.score))) {
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
  const allMatchups = globalThis.__bellHeadToHead || [];
  return list.map(candidate => {
    const editorial = inputs.candidates?.[candidate.name];
    if (!editorial) return null;
    const primaryPath = Number(editorial.primaryPath);
    const blendPath = (score, share) => Number.isFinite(primaryPath) ? score * (1 - share) + primaryPath * share : score;
    const tested = allMatchups.filter(match => clean(match.democrat) === clean(candidate.name) || clean(match.republican) === clean(candidate.name));
    const margins = tested.map(match => clean(match.democrat) === clean(candidate.name) ? Number(match.democratic) - Number(match.republicanVote) : Number(match.republicanVote) - Number(match.democratic));
    const electability = margins.length ? clamp((margins.reduce((sum, value) => sum + value, 0) / margins.length + 5) / 10, 0, 1) : null;
    const primaryPolling = polling.get(clean(candidate.name)) || 0;
    const scores = {
      polling: Number.isFinite(electability) ? primaryPolling * .65 + electability * .35 : primaryPolling,
      bettingMarkets: market.get(clean(candidate.name)) || 0,
      campaignFundamentals: blendPath(editorial.campaignFundamentals, 0.25),
      candidateQuality: editorial.candidateQuality,
      coalitionStrength: blendPath(editorial.coalitionStrength, 0.25),
      socialSentiment: editorial.socialSentiment,
      momentum: editorial.momentum,
      economicBackdrop: editorial.economicBackdrop,
      fragility: blendPath(editorial.fragility, 0.20)
    };
    const result = weightedScore(scores, config);
    return { name: candidate.name, score: round(result.value * 100, 1), primaryPath: Number.isFinite(primaryPath) ? primaryPath : null, factors: scores };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

function findCall(data, pattern) {
  return data.calls.find(call => pattern.test(call.question));
}

function priorSnapshot(history, timestamp, minimumHours = 18) {
  const cutoff = new Date(timestamp).getTime() - minimumHours * 36e5;
  return history.slice().reverse().find(entry => new Date(entry.timestamp).getTime() <= cutoff) || history[0] || null;
}

function watchCandidate(data, inputs, history, timestamp) {
  const prior = priorSnapshot(history, timestamp);
  const priorByName = new Map((prior?.candidates || []).map(candidate => [clean(candidate.name), candidate]));
  const currentPicks = new Set(data.calls.filter(call => /nomination/i.test(call.question)).map(call => clean(call.pickName)));
  const candidates = [...data.field.democratic, ...data.field.republican].filter(candidate => !currentPicks.has(clean(candidate.name))).map(candidate => {
    const editorial = inputs.candidates?.[candidate.name] || {};
    const old = priorByName.get(clean(candidate.name));
    const pollingChange = old && Number.isFinite(Number(candidate.pollAvg)) && Number.isFinite(Number(old.pollAvg)) ? Number(candidate.pollAvg) - Number(old.pollAvg) : 0;
    const week = Number(candidate.marketChange1w) || 0;
    const month = Number(candidate.marketChange1m) || 0;
    const momentum = Number(editorial.momentum) || 0;
    const score = week * 5 + month * 1.5 + pollingChange * 4 + momentum * 8;
    return { candidate, score, week, month, pollingChange };
  }).sort((a, b) => b.score - a.score);
  const leader = candidates[0];
  const darkHorse = data.field.democratic.find(candidate => candidate.darkHorse) || null;
  if (!leader || leader.week < 1) return darkHorse ? { candidateName: darkHorse.name, label: 'Dark horse', headline: `${darkHorse.name.split(' ').at(-1)} has a real primary path`, reason: darkHorse.ourTake } : null;
  const establishedLeader = Number(leader.candidate.oddsNum) >= 35;
  return {
    candidateName: leader.candidate.name,
    label: establishedLeader ? 'Momentum leader' : 'Breakout watch',
    headline: `${leader.candidate.name.split(' ').at(-1)} is gaining now`,
    reason: `${leader.candidate.name} is up ${leader.week.toFixed(1)} points this week${leader.month ? ` and ${leader.month.toFixed(1)} points this month` : ''} in the nomination market.`
  };
}

function appendHistory(history, data, timestamp) {
  const candidates = [...data.field.democratic, ...data.field.republican].map(candidate => ({ name: candidate.name, oddsNum: candidate.oddsNum ?? null, pollAvg: candidate.pollAvg ?? null }));
  history.push({ timestamp, libertyBellIndex: data.libertyBellIndex, calls: { presidential: findCall(data, /which party wins/i)?.ourCall, democratic: findCall(data, /Democratic nomination/i)?.pickName, republican: findCall(data, /Republican nomination/i)?.pickName }, candidates });
  return history.slice(-540);
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
  let history = [];
  try { history = readJson(HISTORY_PATH); } catch {}
  const timestamp = new Date().toISOString();
  globalThis.__bellHeadToHead = data.headToHeadPolling?.matchups || [];

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
  const repRunnerUp = repRank[1] ? data.field.republican.find(candidate => candidate.name === repRank[1].name) : null;
  repCard.ourCall = repRunnerUp && Number(repRunnerUp.marketChange1w) > 0.5 ? `${displayName(repPick)}, with ${displayName(repRunnerUp.name)} gaining` : `${displayName(repPick)} is still the call`;
  const approval = data.nationalPolling?.trumpApproval;
  const genericD = data.nationalPolling?.genericBallotDemocratic;
  const genericR = data.nationalPolling?.genericBallotRepublican;
  presidentialCard.whyShort = democratic >= 50
    ? `Trump approval is ${approval ?? 'underwater'} and Democrats lead the latest national generic ballot${Number.isFinite(genericD) ? ` ${genericD}–${genericR}` : ''}. That gives Democrats the better hand today, not a lock.`
    : 'The national mood, the economy, and the shape of the field give Republicans the better hand today. Better hand, not a lock.';
  const darkHorse = data.field.democratic.find(candidate => candidate.darkHorse);
  const demLeader = data.field.democratic.find(candidate => candidate.name === demPick);
  const repLeader = data.field.republican.find(candidate => candidate.name === repPick);
  const repSecond = repRank[1] ? data.field.republican.find(candidate => candidate.name === repRank[1].name) : null;
  const demPickPoll = data.field.democratic.find(candidate => candidate.name === demPick)?.pollAvg;
  const repPickPoll = data.field.republican.find(candidate => candidate.name === repPick)?.pollAvg;
  demCard.whyShort = darkHorse && darkHorse.name !== demPick
    ? `${displayName(demPick)} leads our full read after primary support, campaign path, and general-election strength are weighed together. ${displayName(darkHorse.name)} remains the pressure point.`
    : `${displayName(demPick)} has the strongest all-around case in The Bell Model today.`;
  repCard.whyShort = repSecond
    ? `${displayName(repPick)} is at ${Number.isFinite(repPickPoll) ? `${repPickPoll.toFixed(1)}% in the polling average` : 'the top of the field'} and still has the clearest path to inheriting Trump’s coalition. ${displayName(repSecond.name)} is the live alternative.`
    : `${displayName(repPick)} has the clearest path to inheriting Trump’s coalition. No rival has built a convincing alternative.`;
  data.powerRanking = watchCandidate(data, inputs, history, timestamp);
  data.modelUpdatedAt = timestamp;
  data.modelMeta = {
    version: '3.0',
    updatedAt: timestamp,
    status: 'scored',
    signalCoverage: `${coverage}/9`,
    score: round(presidential.value * 100, 1),
    factors: Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, { score: round(score, 3), weight: config.factors[key].weight }])),
    nominationRankings: { democratic: demRank, republican: repRank },
    evidenceUpdatedAt: evidence.updatedAt,
    structuralInputsReviewedAt: inputs.updatedAt
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
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(appendHistory(history, data, timestamp), null, 2) + '\n');
  console.log(`The Bell Model scored D ${democratic}% / R ${republican}%; picks: ${demPick} and ${repPick}.`);
}

try { main(); } catch (error) { console.error('The Bell Model frozen:', error.message); process.exit(1); }
