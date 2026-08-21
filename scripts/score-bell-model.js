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
const ELECTORAL_BASELINE = {
  AZ:{ev:11,winner:'R',margin:-5.5,stateFit:-0.6}, GA:{ev:16,winner:'R',margin:-2.2,stateFit:0.2}, MI:{ev:15,winner:'R',margin:-1.4,stateFit:0.6},
  NV:{ev:6,winner:'R',margin:-3.1,stateFit:-0.2}, NC:{ev:16,winner:'R',margin:-3.2,stateFit:0.1}, PA:{ev:19,winner:'R',margin:-1.7,stateFit:0.3}, WI:{ev:10,winner:'R',margin:-0.9,stateFit:0.4}
};

function electoralProjection(democratic, timestamp) {
  // Translate only a capped share of the national nine-signal environment into
  // battleground movement. State baselines and coalition fit remain independent,
  // preventing one national poll or one market from mechanically coloring the map.
  const nationalAdjustment = round(clamp((democratic - 50) * 0.35,-3,3),2);
  const stateWinners = {};
  const stateRatings = {};
  const ratingFor = margin => {
    const size = Math.abs(margin);
    if (size < 1) return 'Tilt';
    if (size < 3.5) return 'Lean';
    if (size < 8) return 'Likely';
    return 'Safe';
  };
  for (const [state, baseline] of Object.entries(ELECTORAL_BASELINE)) {
    const projectedMargin = round(baseline.margin + nationalAdjustment + baseline.stateFit,1);
    const winner = projectedMargin >= 0 ? 'D' : 'R';
    stateWinners[state] = winner;
    stateRatings[state] = {winner,rating:ratingFor(projectedMargin),projectedMargin,stateFit:baseline.stateFit,baseline2024:baseline.margin};
  }
  const democraticFlips = Object.entries(stateWinners).filter(([state,winner]) => winner === 'D' && ELECTORAL_BASELINE[state].winner === 'R');
  const democraticEV = 226 + democraticFlips.reduce((sum,[state]) => sum + ELECTORAL_BASELINE[state].ev,0);
  return {updatedAt:timestamp,democraticEV,republicanEV:538-democraticEV,tossupEV:0,nationalEnvironment:{democratic,republican:round(100-democratic)},nationalAdjustment,stateWinners,stateRatings,battlegrounds:Object.keys(ELECTORAL_BASELINE),method:'Capped national nine-signal environment plus 2024 state baseline and state-specific coalition fit; markets and individual polls cannot directly determine a state call'};
}

function pollQualityMultiplier(poll, config) {
  const qualityConfig = config.pollQuality || {};
  const dimensions = qualityConfig.dimensions || {};
  const review = poll?.qualityReview || {};
  let earned = 0;
  let possible = 0;
  for (const [dimension, weight] of Object.entries(dimensions)) {
    const numericWeight = Number(weight) || 0;
    possible += numericWeight;
    const score = Number(review[dimension]);
    // Unknown quality information earns no affirmative quality credit.
    if (Number.isFinite(score)) earned += clamp(score,0,1) * numericWeight;
  }
  const assessed = possible ? earned / possible : 0;
  const floor = Number(qualityConfig.minimumProvisionalMultiplier || .5);
  return round(clamp(Math.max(floor,assessed),floor,1),2);
}

function scoreIssueBoard(data, config, timestamp) {
  const issues = Array.isArray(data.issueBoard?.issues) ? data.issueBoard.issues : [];
  const issueConfig = config.issueIndex || {};
  const cadenceDays = Number(issueConfig.publishCadenceDays || 7);
  const lastPublished = Date.parse(data.issueBoard?.updatedAt || '');
  const now = Date.parse(timestamp);
  const isPublishedBoard = issues.length === Number(issueConfig.publishedIssueCount || 10) && issues.every(issue => Number.isFinite(Number(issue.rank)));
  if (isPublishedBoard && Number.isFinite(lastPublished) && Number.isFinite(now) && now - lastPublished < cadenceDays * 864e5) {
    data.issueBoard = {
      ...data.issueBoard,
      cadence: 'Updated weekly',
      nextReviewAt: new Date(lastPublished + cadenceDays * 864e5).toISOString()
    };
    return;
  }
  const weights = issueConfig.weights || {};
  const priorRanks = new Map(issues.map(issue => [issue.id, Number(issue.rank)]));
  const score = issue => {
    let earned = 0;
    let possible = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      const value = Number(issue.metrics?.[metric]);
      const numericWeight = Number(weight) || 0;
      if (!Number.isFinite(value) || numericWeight <= 0) continue;
      earned += clamp(value, 0, 100) * numericWeight;
      possible += numericWeight;
    }
    return possible ? round(earned / possible, 1) : 0;
  };
  const ranked = issues
    .map(issue => ({...issue, score: score(issue)}))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, Number(issueConfig.publishedIssueCount || 10))
    .map((issue, index) => ({
      ...issue,
      previousRank: Number.isFinite(priorRanks.get(issue.id)) ? priorRanks.get(issue.id) : index + 1,
      rank: index + 1
    }));
  data.issueBoard = {
    ...data.issueBoard,
    updatedAt: timestamp,
    cadence: 'Updated weekly',
    nextReviewAt: new Date(now + cadenceDays * 864e5).toISOString(),
    modelVersion: config.version,
    method: 'Weighted voter priority, breadth, intensity, momentum, and relevance to the existing nine signals. No single poll or viral moment can set the order.',
    issues: ranked
  };
}

function presidentialScores(data, config, inputs) {
  const scores = {};
  const guard = config.robustness || {};
  const factorCap = Number(guard.maximumFactorScore || .75);
  for (const key of Object.keys(config.factors)) {
    if (key === 'bettingMarkets') {
      const market = Number(data.marketMeta?.partyIndex?.democratic);
      const marketAgeHours = (Date.now() - new Date(data.marketMeta?.retrievedAt).getTime()) / 36e5;
      if (Number.isFinite(market) && Number.isFinite(marketAgeHours) && marketAgeHours <= 24) {
        const rawMarketScore = clamp((market - 50) / 50, -1, 1);
        const platformCount = Number(data.marketMeta?.platformCount || 1);
        const requiredPlatforms = Number(guard.marketPlatformsForFullWeight || 2);
        const confidence = clamp(platformCount / requiredPlatforms, .5, 1);
        const cap = platformCount >= requiredPlatforms ? factorCap : Number(guard.singlePlatformMarketScoreCap || .35);
        scores[key] = clamp(rawMarketScore * confidence, -cap, cap);
      }
    } else if (key === 'polling' && Number.isFinite(Number(data.nationalPolling?.genericBallotDemocratic))) {
      const genericMargin = Number(data.nationalPolling.genericBallotDemocratic) - Number(data.nationalPolling.genericBallotRepublican);
      const approvalDrag = Number(data.nationalPolling.trumpDisapproval) - Number(data.nationalPolling.trumpApproval);
      const rawPollingScore = genericMargin / 20 * .65 + approvalDrag / 30 * .35;
      const sourceCount = Number(data.nationalPolling?.sourceCount || 1);
      // A single poll is useful context, not an average. Cap its authority inside
      // the polling signal until the pipeline has several independent sources.
      const requiredSources = Number(guard.pollingSourcesForFullWeight || 3);
      const confidence = clamp(sourceCount / requiredSources, .45, 1);
      const cap = sourceCount >= requiredSources ? factorCap : Number(guard.singlePollScoreCap || .55);
      const quality = pollQualityMultiplier(data.nationalPolling,config);
      scores[key] = clamp(rawPollingScore * confidence * quality, -cap, cap);
    } else if (Number.isFinite(Number(inputs.presidential?.[key]?.score))) {
      scores[key] = clamp(Number(inputs.presidential[key].score), -factorCap, factorCap);
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

function protectPresidentialMovement(rawDemocratic, scores, previous, config) {
  const guard = config.robustness || {};
  const prior = Number(previous?.libertyBellIndex?.democratic);
  const direction = rawDemocratic >= 50 ? 1 : -1;
  const independent = Object.entries(scores).filter(([key,value]) => !['polling','bettingMarkets'].includes(key) && Math.sign(value) === direction && Math.abs(value) >= .15);
  const requiredForChange = Number(guard.minimumIndependentSignalsForPartyChange || 3);
  const overrideCount = Number(guard.independentSignalsForShockOverride || 5);
  const movementLimit = Number(guard.maximumMovementPerRun || 2);
  let democratic = rawDemocratic;
  let status = 'accepted';

  if (Number.isFinite(prior)) {
    const crossedParty = (prior >= 50 && rawDemocratic < 50) || (prior < 50 && rawDemocratic >= 50);
    if (crossedParty && independent.length < requiredForChange) {
      democratic = prior;
      status = 'party-change-held-for-confirmation';
    } else if (Math.abs(rawDemocratic - prior) > movementLimit && independent.length < overrideCount) {
      democratic = prior + Math.sign(rawDemocratic - prior) * movementLimit;
      status = 'movement-rate-limited';
    }
  }
  return { democratic: round(clamp(democratic,0,100)), rawDemocratic: round(rawDemocratic), independentAgreement: independent.map(([key]) => key), status };
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
  const singlePlatformMarketDiscount = .6;
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
      bettingMarkets: (market.get(clean(candidate.name)) || 0) * singlePlatformMarketDiscount,
      campaignFundamentals: blendPath(editorial.campaignFundamentals, 0.25),
      candidateQuality: editorial.candidateQuality,
      // Coalition strength is not just base enthusiasm. It also asks whether a
      // candidate can hold the party together and reach beyond its ideological
      // lane. Tested head-to-head performance supplies that breadth check when
      // it exists, while primaryPath preserves the realities of winning a
      // nomination before reaching a general election.
      coalitionStrength: Number.isFinite(electability)
        ? blendPath(editorial.coalitionStrength * .70 + electability * .30, 0.25)
        : blendPath(editorial.coalitionStrength, 0.25),
      socialSentiment: editorial.socialSentiment,
      momentum: editorial.momentum,
      economicBackdrop: editorial.economicBackdrop,
      fragility: blendPath(editorial.fragility, 0.20)
    };
    const result = weightedScore(scores, config);
    return { name: candidate.name, score: round(result.value * 100, 1), primaryPath: Number.isFinite(primaryPath) ? primaryPath : null, factors: scores };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

function applyCandidateRaceStatus(list, inputs, history, timestamp) {
  const numeric = value => value === null || value === '' || typeof value === 'undefined' ? NaN : Number(value);
  const prior = priorSnapshot(history, timestamp);
  const priorByName = new Map((prior?.candidates || []).map(candidate => [clean(candidate.name), candidate]));
  for (const candidate of list || []) {
    if (['Ineligible for 2028', 'Not expected to run'].includes(candidate.status)) {
      candidate.pulseDir = 'inactive';
      candidate.pulse = 'Not part of the active 2028 field.';
      continue;
    }
    const candidateInputs = inputs.candidates?.[candidate.name] || {};
    const editorial = numeric(candidateInputs.raceMomentum ?? candidateInputs.momentum);
    const week = numeric(candidate.marketChange1w);
    const month = numeric(candidate.marketChange1m);
    const oldPolling = numeric(priorByName.get(clean(candidate.name))?.pollAvg);
    const currentPolling = numeric(candidate.pollAvg);
    const pollingChange = Number.isFinite(oldPolling) && Number.isFinite(currentPolling) ? currentPolling - oldPolling : NaN;
    const signals = [];
    if (Number.isFinite(editorial)) signals.push({ value: clamp(editorial, -1, 1), weight: .35 });
    if (Number.isFinite(week)) signals.push({ value: clamp(week / 3, -1, 1), weight: .25 });
    if (Number.isFinite(month)) signals.push({ value: clamp(month / 8, -1, 1), weight: .15 });
    if (Number.isFinite(pollingChange)) signals.push({ value: clamp(pollingChange / 3, -1, 1), weight: .25 });
    if (!signals.length) {
      candidate.pulseDir = 'watch';
      candidate.pulse = 'Not enough current movement evidence for a directional label.';
      continue;
    }
    const weight = signals.reduce((sum, signal) => sum + signal.weight, 0);
    const trend = signals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / weight;
    candidate.pulseDir = trend >= .15 ? 'up' : trend <= -.15 ? 'down' : 'flat';
    candidate.pulse = candidate.pulseDir === 'up'
      ? 'The Bell’s combined momentum read is rising.'
      : candidate.pulseDir === 'down'
        ? 'The Bell’s combined momentum read is falling.'
        : 'The Bell’s combined momentum read is holding.';
  }
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
  const rawDemocratic = round(clamp(50 + presidential.value * 25, 0, 100));
  const protection = protectPresidentialMovement(rawDemocratic, scores, previous, config);
  const democratic = protection.democratic;
  const republican = round(100 - democratic);
  const presidentialCall = callLabel(democratic);
  const demRank = scoreCandidates(data.field.democratic, config, inputs);
  const repRank = scoreCandidates(data.field.republican, config, inputs);
  if (!demRank.length || !repRank.length) throw new Error('Candidate ratings are missing');
  applyCandidateRaceStatus(data.field.democratic, inputs, history, timestamp);
  applyCandidateRaceStatus(data.field.republican, inputs, history, timestamp);

  const presidentialCard = findCall(data, /which party wins/i);
  const demCard = findCall(data, /Democratic nomination/i);
  const repCard = findCall(data, /Republican nomination/i);
  const demPick = demRank[0].name;
  const repPick = repRank[0].name;
  const displayName = name => name === 'Alexandria Ocasio-Cortez' ? 'AOC' : name.split(' ').at(-1);
  const previousPowerRanking = data.powerRanking?.candidateName || null;
  const editorialRules = config.editorial?.headlineRefresh || {};
  const previousDemocratic = Number(previous.libertyBellIndex?.democratic);
  const bellMovement = Number.isFinite(previousDemocratic) ? round(Math.abs(democratic - previousDemocratic), 1) : null;
  const previousParty = Number.isFinite(previousDemocratic) ? (previousDemocratic >= 50 ? 'D' : 'R') : null;
  const currentParty = democratic >= 50 ? 'D' : 'R';
  const editorialTriggers = [];
  if (previousParty && previousParty !== currentParty) editorialTriggers.push('party call changed');
  if (previous.democraticPick && previous.democraticPick !== demPick) editorialTriggers.push('Democratic pick changed');
  if (previous.republicanPick && previous.republicanPick !== repPick) editorialTriggers.push('Republican pick changed');
  if (Number.isFinite(bellMovement) && bellMovement >= Number(editorialRules.minimumBellMovement || 1)) editorialTriggers.push(`Bell moved ${bellMovement.toFixed(1)} points`);

  data.libertyBellIndex = { democratic, republican };
  data.modelSafeguards = {
    updatedAt: timestamp,
    status: protection.status,
    rawDemocratic: protection.rawDemocratic,
    publishedDemocratic: democratic,
    independentAgreement: protection.independentAgreement,
    pollingSourceCount: Number(data.nationalPolling?.sourceCount || 1),
    pollingQualityMultiplier: pollQualityMultiplier(data.nationalPolling,config),
    marketPlatformCount: Number(data.marketMeta?.platformCount || 1),
    rules: config.robustness
  };
  data.electoralProjection = electoralProjection(democratic, timestamp);
  presidentialCard.ourCall = presidentialCall;
  presidentialCard.partySeal = democratic >= 50 ? 'd' : 'r';
  demCard.pickName = demPick;
  repCard.pickName = repPick;
  demCard.ourCall = `${displayName(demPick)}, carefully`;
  const repRunnerUp = repRank[1] ? data.field.republican.find(candidate => candidate.name === repRank[1].name) : null;
  repCard.ourCall = repRunnerUp && Number(repRunnerUp.marketChange1w) > 0.5 ? `${displayName(repPick)}, with ${displayName(repRunnerUp.name)} gaining` : `${displayName(repPick)} is still the call`;
  presidentialCard.whyShort = democratic >= 50
    ? 'Democrats have the better hand today. It is an edge, not a permission slip to relax.'
    : 'Republicans have the better hand today. It is an edge, not a victory lap.';
  const darkHorse = data.field.democratic.find(candidate => candidate.darkHorse);
  const repSecond = repRank[1] ? data.field.republican.find(candidate => candidate.name === repRank[1].name) : null;
  demCard.whyShort = darkHorse && darkHorse.name !== demPick
    ? `${displayName(demPick)} owns the energy. ${displayName(darkHorse.name)} has the clearest route to making that call uncomfortable.`
    : `${displayName(demPick)} has the strongest complete case today.`;
  repCard.whyShort = repSecond
    ? `${displayName(repPick)} owns the inheritance. ${displayName(repSecond.name)} is the real pressure test.`
    : `${displayName(repPick)} owns the inheritance. No rival has built a convincing alternative.`;
  data.powerRanking = watchCandidate(data, inputs, history, timestamp);
  if (previousPowerRanking && data.powerRanking?.candidateName && previousPowerRanking !== data.powerRanking.candidateName) editorialTriggers.push('breakout watch changed');
  data.editorialRefresh = {
    evaluatedAt: timestamp,
    headlineChangeWarranted: editorialTriggers.length > 0,
    triggers: editorialTriggers,
    policy: 'Headlines change for a meaningful evidence shift, not merely because the scheduled model ran.'
  };
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
  scoreIssueBoard(data, config, timestamp);

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
