const $ = selector => document.querySelector(selector);
const page = document.body.dataset.page || 'forecast';
const NAV = [
  ['forecast', '/', 'Home'],
  ['candidates', '/candidates.html', '2028 Field'],
  ['markets', '/market-gap.html', 'Matchup Builder'],
  ['issues', '/issues.html', 'The Issues'],
  ['map', '/map.html', 'Electoral Map'],
  ['methodology', '/methodology.html', 'How It Works'],
  ['ledger', '/ledger.html', 'Receipts']
];

function header() {
  return `<header class="masthead"><div class="shell masthead-main"><a class="brand" href="/"><img class="brand-mark-image" src="/assets/the-bell-brand-mark-v4.png" alt=""><span class="brand-name">The Bell</span></a><div class="mast-actions"><a class="btn donate" href="https://ko-fi.com/libertybellvote" target="_blank" rel="noopener">Donate</a><button class="nav-toggle" id="nav-toggle" aria-label="Open site navigation" aria-controls="site-nav" aria-expanded="false"><span></span><span></span></button><button class="theme-toggle" id="theme-toggle" aria-label="Toggle night mode" title="Toggle night mode">◐</button></div></div></header><nav class="nav" id="site-nav"><div class="shell">${NAV.map(([id, url, label]) => `<a class="${page === id || (page === 'candidate' && id === 'candidates') ? 'active' : ''}" href="${url}">${label}</a>`).join('')}</div></nav>`;
}

function footer() {
  return `<footer><div class="shell"><div class="footer-lead"><div class="footer-lockup"><img class="brand-mark-image" src="/assets/the-bell-brand-mark-v4.png" alt=""><div><div class="footer-name">The Bell</div><p>Which way will The Bell swing?</p></div></div><div class="footer-support"><p>Independent coverage of the 2028 presidential election.</p><a class="btn donate" href="https://ko-fi.com/libertybellvote" target="_blank" rel="noopener">Support The Bell</a></div></div><div class="footer-grid"><div class="footer-col"><strong>Explore</strong><a href="/">Home</a><a href="/candidates.html">2028 Field</a><a href="/market-gap.html">Matchup Builder</a><a href="/issues.html">The Issues</a><a href="/map.html">Electoral Map</a></div><div class="footer-col"><strong>Accountability</strong><a href="/methodology.html">How It Works</a><a href="/ledger.html">Receipts</a><a href="mailto:libertybellvote@gmail.com?subject=Correction">Corrections</a></div><div class="footer-col"><strong>Connect</strong><a href="https://x.com/LibertyBellVote">X / Twitter</a><a href="https://instagram.com/LibertyBellVote">Instagram</a><a href="mailto:libertybellvote@gmail.com?subject=Sponsoring%20The%20Bell">Sponsor The Bell</a><a href="mailto:libertybellvote@gmail.com">Contact</a></div></div><div class="copyright">© 2026 The Bell · All rights reserved · Model estimates are not polls, guarantees, or financial advice.</div></div></footer>`;
}

$('#site-header').innerHTML = header();
$('#site-footer').innerHTML = footer();

function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('lbv-theme', dark ? 'dark' : 'light');
  $('#theme-toggle').textContent = dark ? '☀' : '◐';
}

setTheme(localStorage.getItem('lbv-theme') === 'dark' || (!localStorage.getItem('lbv-theme') && matchMedia('(prefers-color-scheme:dark)').matches));
$('#theme-toggle').onclick = () => setTheme(!document.body.classList.contains('dark'));
const navToggle = $('#nav-toggle');
const siteNav = $('#site-nav');
navToggle.onclick = () => {
  const open = siteNav.classList.toggle('is-open');
  navToggle.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close site navigation' : 'Open site navigation');
};

const fmt = number => Number(number || 0).toFixed(1) + '%';
const clean = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const updated = iso => new Date(iso).toLocaleString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'}) + ' ET';
const shortDate = iso => new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York'});
const movement = candidate => ['Ineligible for 2028', 'Not expected to run'].includes(candidate.status) ? ['Inactive', 'flat'] : candidate.status === 'Possible third-party' ? ['Exploratory', 'flat'] : candidate.pulseDir === 'up' ? ['▲ Rising', 'up'] : candidate.pulseDir === 'down' ? ['▼ Falling', 'down'] : candidate.pulseDir === 'watch' ? ['Watching', 'flat'] : ['Holding', 'flat'];
const BIO_LINKS = {
  'Alexandria Ocasio-Cortez': 'https://ballotpedia.org/Alexandria_Ocasio-Cortez',
  'Andy Beshear': 'https://ballotpedia.org/Andy_Beshear',
  'Brian Kemp': 'https://ballotpedia.org/Brian_Kemp',
  'Cory Booker': 'https://ballotpedia.org/Cory_Booker',
  'Elissa Slotkin': 'https://ballotpedia.org/Elissa_Slotkin',
  'Gavin Newsom': 'https://ballotpedia.org/Gavin_Newsom',
  'Glenn Youngkin': 'https://ballotpedia.org/Glenn_Youngkin',
  'Gretchen Whitmer': 'https://ballotpedia.org/Gretchen_Whitmer',
  'Jon Ossoff': 'https://ballotpedia.org/Jon_Ossoff',
  'Josh Shapiro': 'https://ballotpedia.org/Josh_Shapiro',
  'Kamala Harris': 'https://ballotpedia.org/Kamala_Harris',
  'Marco Rubio': 'https://ballotpedia.org/Marco_Rubio',
  'Mark Kelly': 'https://ballotpedia.org/Mark_Kelly',
  'Nikki Haley': 'https://ballotpedia.org/Nikki_Haley',
  'Pete Buttigieg': 'https://ballotpedia.org/Pete_Buttigieg',
  'Ro Khanna': 'https://ballotpedia.org/Ro_Khanna',
  'Ron DeSantis': 'https://ballotpedia.org/Ron_DeSantis',
  'Roy Cooper': 'https://ballotpedia.org/Roy_Cooper',
  'Ted Cruz': 'https://ballotpedia.org/Ted_Cruz',
  'Tim Scott': 'https://ballotpedia.org/Tim_Scott',
  'Wes Moore': 'https://ballotpedia.org/Wes_Moore'
};
const candidateSlug = name => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const candidateProfileUrl = name => `/candidate.html?name=${encodeURIComponent(candidateSlug(name))}`;
const candidateWikipediaUrl = name => `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, '_'))}`;
let bellAudioContext;

function playBellGong() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return;
  bellAudioContext ||= new AudioEngine();
  const context = bellAudioContext;
  if (context.state === 'suspended') context.resume();
  const start = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(.0001, start);
  master.gain.exponentialRampToValueAtTime(.14, start + .018);
  master.gain.exponentialRampToValueAtTime(.0001, start + 2.8);
  master.connect(context.destination);
  [196, 247, 313, 392, 523].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const partial = context.createGain();
    oscillator.type = index < 2 ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(index % 2 ? 5 : -4, start);
    partial.gain.setValueAtTime(1 / (index + 1.25), start);
    partial.gain.exponentialRampToValueAtTime(.0001, start + 1.5 + index * .22);
    oscillator.connect(partial); partial.connect(master);
    oscillator.start(start); oscillator.stop(start + 2.9);
  });
}

function allCandidates(data) {
  return [...(data.field?.democratic || []), ...(data.field?.republican || []), ...(data.thirdParty || [])];
}

function partyBadge(party) {
  const key = party === 'democratic' || party === 'Democratic' ? 'd' : party === 'republican' || party === 'Republican' ? 'r' : 'i';
  return `<span class="party-badge ${key}" aria-label="${key === 'd' ? 'Democratic' : key === 'r' ? 'Republican' : 'Independent or third party'}">${key.toUpperCase()}</span>`;
}

function findCandidate(data, name) {
  const target = clean(name);
  return allCandidates(data).find(candidate => clean(candidate.name) === target || clean(candidate.name).includes(target) || target.includes(clean(candidate.name)));
}

const CLASSIFICATIONS = {
  'Alexandria Ocasio-Cortez': 'DSA / democratic socialist', 'Gavin Newsom': 'Liberal establishment',
  'Jon Ossoff': 'Center-left', 'Pete Buttigieg': 'Center-left', 'Kamala Harris': 'Liberal establishment',
  'Josh Shapiro': 'Center-left', 'Andy Beshear': 'Moderate', 'JB Pritzker': 'Liberal establishment',
  'Cory Booker': 'Liberal', 'Wes Moore': 'Center-left', 'Ro Khanna': 'Progressive', 'Mark Kelly': 'Moderate',
  'Rahm Emanuel': 'Centrist establishment', 'Gretchen Whitmer': 'Center-left', 'Stephen A. Smith': 'Moderate outsider',
  'Roy Cooper': 'Moderate', 'Elissa Slotkin': 'Center-left', 'Mark Cuban': 'Centrist outsider',
  'Barack Obama': 'Liberal establishment', 'Joe Biden': 'Liberal establishment',
  'JD Vance': 'National conservative', 'Marco Rubio': 'Conservative', 'Robert F. Kennedy Jr.': 'Populist outsider',
  'Ted Cruz': 'Movement conservative', 'Ron DeSantis': 'MAGA conservative', 'Nikki Haley': 'Establishment conservative',
  'Brian Kemp': 'Establishment conservative', 'Tim Scott': 'Conservative', 'Glenn Youngkin': 'Establishment conservative',
  'Donald Trump Jr.': 'MAGA populist',
  'Donald Trump': 'MAGA populist', 'Tucker Carlson': 'Right populist', 'Jill Stein': 'Green left'
};

function personName(candidate, className = '') {
  return `<span class="person-name ${className}"><img src="${candidate.photo || ''}" alt="" loading="lazy"><span>${candidate.name}</span></span>`;
}

function miniField(list) {
  return (list || []).slice(0, 5).map((candidate, index) => `<div class="field-line"><span class="field-rank">${index + 1}</span>${personName(candidate, 'field-person')}<span class="field-track"><i style="width:${Math.min(100, candidate.oddsNum * 3.3)}%"></i></span><strong>${candidate.odds}</strong></div>`).join('');
}

function renderForecast(data) {
  const call = (data.calls || []).find(item => /which party wins/i.test(item.question));
  const dem = data.libertyBellIndex.democratic;
  const rep = data.libertyBellIndex.republican;
  const margin = dem - rep;
  const abs = Math.abs(margin);
  const leader = margin >= 0 ? 'Democratic' : 'Republican';
  const partyPlural = margin >= 0 ? 'Democrats' : 'Republicans';
  const rating = abs < 5 ? 'Toss-up' : abs < 15 ? `Leans ${leader}` : `Favors ${leader}`;
  const dems = [...data.field.democratic].sort((a, b) => b.oddsNum - a.oddsNum);
  const reps = [...data.field.republican].sort((a, b) => b.oddsNum - a.oddsNum);
  const demCall = (data.calls || []).find(item => /Democratic nomination/i.test(item.question));
  const repCall = (data.calls || []).find(item => /Republican nomination/i.test(item.question));
  const watchName = data.powerRanking?.candidateName || data.powerRanking?.name;
  const watch = findCandidate(data, watchName);

  $('#dem-pct').textContent = fmt(dem);
  $('#rep-pct').textContent = fmt(rep);
  $('#dem-bar').style.width = dem + '%';
  $('#rep-bar').style.width = rep + '%';
  $('#rating').textContent = rating;
  $('#bell-direction').textContent = margin >= 0 ? 'Swinging toward Democrats' : 'Swinging toward Republicans';
  $('.bell-visual').classList.toggle('lead-dem', margin >= 0);
  $('.bell-visual').classList.toggle('lead-rep', margin < 0);
  const swingAngle = Math.max(-42, Math.min(42, margin * .42));
  const arm = $('#swing-arm');
  const stage = $('.swing-stage');
  const axisMarker = $('#bell-axis-marker');
  const axisValue = $('#bell-axis-value');
  const setAxis = (demValue, repValue) => {
    axisMarker.style.left = `${repValue}%`;
    axisValue.textContent = demValue === repValue ? '50–50' : `${Math.round(Math.max(demValue, repValue))}% ${demValue > repValue ? 'D' : 'R'}`;
  };
  arm.style.transform = `rotate(${swingAngle.toFixed(1)}deg)`;
  setAxis(dem, rep);
  arm.title = 'Drag the Bell to preview a different race. Release to return to the model.';
  const restoreForecast = () => {
    arm.classList.remove('dragging');
    axisMarker.style.transition = '';
    arm.style.transform = `rotate(${swingAngle.toFixed(1)}deg)`;
    $('#dem-pct').textContent = fmt(dem); $('#rep-pct').textContent = fmt(rep);
    $('#dem-bar').style.width = dem + '%'; $('#rep-bar').style.width = rep + '%';
    $('#rating').textContent = rating;
    $('#bell-direction').textContent = margin >= 0 ? 'Swinging toward Democrats' : 'Swinging toward Republicans';
    setAxis(dem, rep);
  };
  arm.onpointerdown = event => {
    if (event.button !== 0) return;
    arm.classList.add('dragging'); arm.setPointerCapture(event.pointerId);
    axisMarker.style.transition = 'none';
  };
  arm.onpointermove = event => {
    if (!arm.classList.contains('dragging')) return;
    const rect = stage.getBoundingClientRect();
    const previewAngle = Math.max(-42, Math.min(42, (rect.left + rect.width / 2 - event.clientX) / (rect.width / 2) * 42));
    const previewDem = Math.max(0, Math.min(100, 50 + previewAngle * (50 / 42)));
    const previewRep = 100 - previewDem;
    arm.style.transform = `rotate(${previewAngle.toFixed(1)}deg)`;
    $('#dem-pct').textContent = fmt(previewDem); $('#rep-pct').textContent = fmt(previewRep);
    $('#dem-bar').style.width = previewDem + '%'; $('#rep-bar').style.width = previewRep + '%';
    const previewMargin = Math.abs(previewDem - previewRep);
    $('#rating').textContent = previewMargin < 5 ? 'Toss-up preview' : `Preview: ${previewDem >= previewRep ? 'Democratic' : 'Republican'} edge`;
    $('#bell-direction').textContent = 'Release to return to The Bell';
    setAxis(previewDem, previewRep);
  };
  arm.onpointerup = () => { restoreForecast(); playBellGong(); };
  arm.onpointercancel = restoreForecast;
  $('#updated').textContent = updated(data.modelUpdatedAt || data.modelMeta?.updatedAt || data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.lastUpdated);
  $('#forecast-summary').textContent = call?.whyShort || 'The market has a favorite. The race does not have a winner.';
  $('#dem-mini').innerHTML = miniField(dems);
  $('#rep-mini').innerHTML = miniField(reps);
  $('#market-read').innerHTML = `The Bell currently gives <strong>${partyPlural}</strong> the edge in the 2028 presidential race. Both nomination contests remain open.`;
  $('#snapshot-party').innerHTML = margin >= 0 ? '<img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/DemDonkey.svg" alt="Democratic Party donkey">' : '<img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Republican_Disc.svg" alt="Republican Party elephant">';
  $('#snapshot-party').className = margin >= 0 ? 'd' : 'r';
  $('#snapshot-president-rating').textContent = rating;
  $('#snapshot-president-call').textContent = call?.ourCall || `${partyPlural} have the edge`;
  $('#snapshot-president-copy').textContent = call?.whyShort || `${partyPlural} lead the current Bell model.`;
  const demPick = findCandidate(data, demCall?.pickName) || dems[0];
  const repPick = findCandidate(data, repCall?.pickName) || reps[0];
  $('#snapshot-dem-call').innerHTML = personName(demPick);
  $('#snapshot-rep-call').innerHTML = personName(repPick);
  $('#snapshot-dem-rating').textContent = demCall?.ourCall || demPick.name;
  $('#snapshot-rep-rating').textContent = repCall?.ourCall || repPick.name;
  $('#snapshot-dem-copy').textContent = demCall?.whyShort || 'The Democratic nomination remains open.';
  $('#snapshot-rep-copy').textContent = repCall?.whyShort || 'The Republican nomination remains open.';
  $('#snapshot-watch-call').innerHTML = watch ? personName(watch) : `<span>${watchName || 'No clear mover'}</span>`;
  $('#snapshot-watch-label').textContent = data.powerRanking?.label || 'Watch';
  $('#snapshot-watch-rating').textContent = data.powerRanking?.headline || (watch ? `${watch.name.split(' ').at(-1)} is the name to watch` : 'No breakout yet');
  $('#snapshot-watch-copy').textContent = data.powerRanking?.reason || watch?.pulse || 'No candidate has separated from the field this week.';
  const video = data.latestVideo;
  if (video?.videoId) {
    const videoTitle = $('#latest-video-title');
    const videoLink = $('#latest-video-link');
    const videoFrame = $('#latest-video-frame');
    if (videoTitle) videoTitle.textContent = video.title || 'The latest from The Bell';
    if (videoLink) videoLink.href = video.url || `https://www.youtube.com/watch?v=${video.videoId}`;
    if (videoFrame) {
      videoFrame.src = video.embedUrl || `https://www.youtube-nocookie.com/embed/${video.videoId}`;
      videoFrame.title = video.title || 'Latest video from The Bell';
    }
  }
}

function candidateCard(candidate, index, party, rankLabel = '') {
  const [label, cls] = movement(candidate);
  const polling = candidate.pollAvg != null ? candidate.pollAvg.toFixed(1) + '%' : 'N/A';
  const marketPrice = candidate.status === 'Ineligible for 2028' || !candidate.odds || candidate.odds === 'Not listed' || candidate.odds === 'Not running' ? 'N/A' : candidate.odds;
  const rank = rankLabel ? `<div class="candidate-rank"><span>The Bell rank</span><strong>${rankLabel}</strong></div>` : '';
  const profileUrl = candidateProfileUrl(candidate.name);
  return `<article class="candidate-card compact-candidate"><a class="candidate-photo candidate-bio-link" href="${profileUrl}" aria-label="Open ${candidate.name}'s Bell profile" title="Open candidate profile"><img src="${candidate.photo || ''}" alt="${candidate.name}" loading="lazy"><span class="photo-profile-cue">View profile</span></a><div class="candidate-body">${rank}<div class="candidate-name-row"><h2><a href="${profileUrl}">${candidate.name}</a></h2>${partyBadge(party)}</div><div class="role">${candidate.role || ''}</div><div class="candidate-classification">${CLASSIFICATIONS[candidate.name] || 'Unclassified'}</div><div class="candidate-metrics"><div class="candidate-metric"><strong>${marketPrice}</strong><span>Market price</span></div><div class="candidate-metric"><strong class="${candidate.pollAvg == null ? 'metric-missing' : ''}">${polling}</strong><span>Polling</span></div><div class="candidate-metric"><strong class="pulse ${cls}">${label}</strong><span>Race status</span></div></div><p class="candidate-watch"><span>In one sentence</span>${candidate.vibe || candidate.ourTake || 'The campaign case is still developing.'}</p></div></article>`;
}

function renderCandidateProfile(data) {
  const requested = new URLSearchParams(location.search).get('name') || '';
  const candidate = allCandidates(data).find(item => candidateSlug(item.name) === candidateSlug(requested));
  const host = $('#candidate-profile');
  if (!candidate || !host) {
    if (host) host.innerHTML = `<section class="profile-not-found"><span class="eyebrow">2028 Field</span><h1>Candidate not found.</h1><p>This profile may have moved.</p><a class="btn" href="/candidates.html">Return to the field</a></section>`;
    return;
  }
  const party = (data.field?.democratic || []).includes(candidate) ? 'democratic' : (data.field?.republican || []).includes(candidate) ? 'republican' : 'independent';
  const partyName = party === 'democratic' ? 'Democrat' : party === 'republican' ? 'Republican' : 'Outside party';
  const activeField = (party === 'democratic' ? data.field.democratic : party === 'republican' ? data.field.republican : data.thirdParty || []).filter(item => !['Ineligible for 2028', 'Not expected to run'].includes(item.status));
  const rankingRows = data.modelMeta?.nominationRankings?.[party] || [];
  const ranking = rankingRows.findIndex(row => row.name === candidate.name);
  const fallbackRank = [...activeField].sort((a, b) => (Number(b.pollAvg) || 0) - (Number(a.pollAvg) || 0) || (Number(b.oddsNum) || 0) - (Number(a.oddsNum) || 0)).findIndex(item => item.name === candidate.name);
  const rank = ranking >= 0 ? ranking + 1 : fallbackRank >= 0 ? fallbackRank + 1 : null;
  const [status, statusClass] = movement(candidate);
  const marketPrice = candidate.status === 'Ineligible for 2028' || !candidate.odds || candidate.odds === 'Not listed' || candidate.odds === 'Not running' ? 'N/A' : candidate.odds;
  const polling = candidate.pollAvg != null ? candidate.pollAvg.toFixed(1) + '%' : 'N/A';
  const ballotpedia = BIO_LINKS[candidate.name];
  const sources = [
    ballotpedia ? `<a href="${ballotpedia}" target="_blank" rel="noopener">Ballotpedia profile</a>` : '',
    `<a href="${candidateWikipediaUrl(candidate.name)}" target="_blank" rel="noopener">Background and references</a>`,
    data.pollingMeta?.parties?.[party]?.url ? `<a href="${data.pollingMeta.parties[party].url}" target="_blank" rel="noopener">Polling aggregation</a>` : ''
  ].filter(Boolean).map(link => `<li>${link}</li>`).join('');
  const eligibility = candidate.status === 'Ineligible for 2028'
    ? `${candidate.name} is included for political context but is constitutionally ineligible to be elected president in 2028.`
    : candidate.status === 'Not expected to run'
      ? `${candidate.name} is included as a reference point and is not currently part of the active 2028 field.`
      : `${candidate.name} is included in The Bell’s current ${partyName.toLowerCase()} field. This is a live assessment, not a declaration of candidacy.`;
  document.title = `${candidate.name}: 2028 Candidate Profile | The Bell`;
  const description = `${candidate.name} 2028 profile, polling, market odds, Bell Rank, political background, and current race status.`;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) descriptionMeta.content = description;
  const canonicalUrl = `https://thebell.vote${candidateProfileUrl(candidate.name)}`;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;
  const socialMeta = {
    'og:title': `${candidate.name}: 2028 Candidate Profile | The Bell`,
    'og:description': description,
    'og:url': canonicalUrl,
    'og:image': candidate.photo || 'https://thebell.vote/assets/social-card.png',
    'twitter:title': `${candidate.name}: 2028 Candidate Profile | The Bell`,
    'twitter:description': description,
    'twitter:image': candidate.photo || 'https://thebell.vote/assets/social-card.png'
  };
  Object.entries(socialMeta).forEach(([key, content]) => {
    const attribute = key.startsWith('og:') ? 'property' : 'name';
    let meta = document.querySelector(`meta[${attribute}="${key}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, key);
      document.head.appendChild(meta);
    }
    meta.content = content;
  });
  host.innerHTML = `<a class="profile-back" href="/candidates.html">← Back to the 2028 field</a><article class="candidate-profile-card"><div class="profile-portrait"><img src="${candidate.photo || ''}" alt="${candidate.name}"></div><div class="profile-lead"><div class="profile-kicker">${partyBadge(party)}<span>${partyName} · 2028 profile</span></div><h1>${candidate.name}</h1><p class="profile-role">${candidate.role || ''}</p><div class="candidate-classification">${CLASSIFICATIONS[candidate.name] || 'Unclassified'}</div><div class="profile-metrics"><div><span>Bell Rank</span><strong>${rank ? `#${rank}` : 'Reference'}</strong></div><div><span>Polling</span><strong>${polling}</strong></div><div><span>Market odds</span><strong>${marketPrice}</strong></div><div><span>Race status</span><strong class="pulse ${statusClass}">${status}</strong></div></div></div></article><section class="profile-story-grid"><article class="profile-read"><span class="eyebrow">The Bell’s read</span><h2>${candidate.vibe || candidate.ourTake || 'The campaign case is still developing.'}</h2><p>${eligibility}</p></article><aside class="profile-facts"><div><span>Current role</span><strong>${candidate.role || 'Not currently in office'}</strong></div><div><span>Political lane</span><strong>${CLASSIFICATIONS[candidate.name] || 'Unclassified'}</strong></div><div><span>Last data update</span><strong>${shortDate(data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.lastUpdated)}</strong></div></aside></section><section class="profile-sources"><div><span class="eyebrow">Sources and further reading</span><h2>Read the record.</h2><p>The Bell writes its own assessment. External sources are provided for factual background, polling context, and further reading.</p></div><ul>${sources}</ul></section><div class="profile-disclosure">Biographical summaries are original Bell copy. Polling, market data, and Bell Rank may change as the race moves.</div>`;
}

function renderCandidates(data) {
  let currentParty = 'democratic';
  let currentSort = 'bell';
  const inactiveStatuses = new Set(['Ineligible for 2028', 'Not expected to run']);
  const numeric = value => value == null || value === '' ? null : Number(value);
  const descending = (a, b, key) => {
    const av = numeric(a[key]);
    const bv = numeric(b[key]);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  };
  const alphabetic = (a, b) => a.name.localeCompare(b.name);

  const draw = party => {
    currentParty = party;
    const all = [...(party === 'democratic' ? data.field.democratic : party === 'republican' ? data.field.republican : data.thirdParty || [])];
    const list = all.filter(candidate => !inactiveStatuses.has(candidate.status));
    const reference = all.filter(candidate => inactiveStatuses.has(candidate.status)).sort(alphabetic);
    const rankings = data.modelMeta?.nominationRankings?.[party] || [];
    const rankMap = new Map(rankings.map((row, index) => [row.name.toLowerCase(), { position: index + 1, score: Number(row.score) || 0 }]));
    const ranked = candidate => rankMap.get(candidate.name.toLowerCase());

    const bellOrder = (a, b) => {
      const ar = ranked(a);
      const br = ranked(b);
      if (ar && br) return br.score - ar.score || ar.position - br.position;
      if (ar) return -1;
      if (br) return 1;
      return descending(a, b, 'pollAvg') || descending(a, b, 'oddsNum') || alphabetic(a, b);
    };
    const bellRank = new Map([...list].sort(bellOrder).map((candidate, index) => [candidate.name.toLowerCase(), index + 1]));

    list.sort((a, b) => {
      if (currentSort === 'alpha') return alphabetic(a, b);
      if (currentSort === 'polling') return descending(a, b, 'pollAvg') || descending(a, b, 'oddsNum') || alphabetic(a, b);
      if (currentSort === 'market') return descending(a, b, 'oddsNum') || descending(a, b, 'pollAvg') || alphabetic(a, b);
      return bellOrder(a, b);
    });

    $('#candidate-grid').innerHTML = list.map((candidate, index) => {
      const rankLabel = currentSort === 'bell' ? String(bellRank.get(candidate.name.toLowerCase())).padStart(2, '0') : '';
      return candidateCard(candidate, index, party, rankLabel);
    }).join('');
    const referenceSection = $('#reference-field');
    const referenceGrid = $('#reference-grid');
    if (referenceSection && referenceGrid) {
      referenceSection.hidden = reference.length === 0;
      referenceGrid.innerHTML = reference.map((candidate, index) => candidateCard(candidate, index, party)).join('');
    }
    const pollMeta = data.pollingMeta?.parties?.[party];
    const source = $('#polling-source');
    if (source) source.innerHTML = pollMeta ? `Polling: <a href="${pollMeta.url}" target="_blank" rel="noopener">national aggregation</a>. Candidates absent from the average are marked N/A.` : party === 'independent' ? 'No comparable national primary polling average exists for outside-party candidates.' : 'Polling aggregation is temporarily unavailable.';
    document.querySelectorAll('.party-switch button').forEach(button => button.classList.toggle('active', button.dataset.party === party));
    document.querySelectorAll('#candidate-sort button').forEach(button => button.classList.toggle('active', button.dataset.sort === currentSort));
  };
  document.querySelectorAll('.party-switch button').forEach(button => button.onclick = () => draw(button.dataset.party));
  document.querySelectorAll('#candidate-sort button').forEach(button => button.onclick = () => {
    currentSort = button.dataset.sort;
    draw(currentParty);
  });
  draw('democratic');
  $('#candidate-updated').textContent = updated(data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.lastUpdated);
}

function renderMarkets(data) {
  $('#market-updated').textContent = updated(data.marketMeta?.retrievedAt || data.marketUpdatedAt || data.lastUpdated);
  const calls = data.calls || [];
  const eligibleForMatchup = candidate => !['Ineligible for 2028', 'Not expected to run'].includes(candidate.status);
  const alphabetical = (a, b) => a.name.localeCompare(b.name);
  const dems = [...(data.field?.democratic || [])].filter(eligibleForMatchup).sort(alphabetical);
  const reps = [...(data.field?.republican || [])].filter(eligibleForMatchup).sort(alphabetical);
  const partyCall = calls.find(call => /party|wins the presidency/i.test(call.question)) || calls[0];
  const demCall = calls.find(call => /Democratic/i.test(call.question));
  const repCall = calls.find(call => /Republican/i.test(call.question));
  const partyOutcomes = partyCall?.outcomes || [];
  const demParty = partyOutcomes.find(outcome => /Democratic/i.test(outcome.label))?.probability || data.libertyBellIndex?.democratic || 50;
  const repParty = partyOutcomes.find(outcome => /Republican/i.test(outcome.label))?.probability || data.libertyBellIndex?.republican || 50;
  const rankings = data.modelMeta?.nominationRankings || {};
  const modelRow = (candidate, party) => rankings[party]?.find(row => row.name === candidate.name);
  const generalElectionWeights = {
    campaignFundamentals: 12,
    candidateQuality: 10,
    coalitionStrength: 12,
    socialSentiment: 6,
    momentum: 10,
    economicBackdrop: 14,
    fragility: 6
  };
  const normalizedMetric = (candidate, list, field) => {
    const max = Math.max(...list.map(item => Math.max(0, Number(item[field]) || 0)), 1);
    return Math.max(0, Number(candidate[field]) || 0) / max;
  };
  const editorialStrength = row => {
    if (!row?.factors) return null;
    let weighted = 0;
    let weight = 0;
    Object.entries(generalElectionWeights).forEach(([key, factorWeight]) => {
      const value = Number(row.factors[key]);
      if (!Number.isFinite(value)) return;
      weighted += value * factorWeight;
      weight += factorWeight;
    });
    return weight ? weighted / weight : null;
  };
  const candidateStrength = (candidate, party) => {
    const list = party === 'democratic' ? dems : reps;
    const editorial = editorialStrength(modelRow(candidate, party));
    const poll = normalizedMetric(candidate, list, 'pollAvg');
    const market = normalizedMetric(candidate, list, 'oddsNum');
    const momentum = Math.max(-1, Math.min(1, (Number(candidate.marketChange1w) || 0) / 5));
    if (Number.isFinite(editorial)) return {value: Math.max(-1, Math.min(1, editorial * 0.70 + poll * 0.12 + market * 0.10 + momentum * 0.08)), coverage: 'Full Bell Model'};
    return {value: Math.max(-1, Math.min(1, 0.45 + (poll - 0.5) * 0.20 + (market - 0.5) * 0.18 + momentum * 0.10)), coverage: 'Available polling, market, and momentum evidence'};
  };
  const matchupEstimate = (dem, rep) => {
    const polled = (data.headToHeadPolling?.matchups || []).find(match => match.democrat === dem.name && match.republican === rep.name);
    const demStrength = candidateStrength(dem, 'democratic');
    const repStrength = candidateStrength(rep, 'republican');
    const environment = Number(data.libertyBellIndex?.democratic || 50);
    const candidateRead = Math.max(25, Math.min(75, 50 + (demStrength.value - repStrength.value) * 25));
    const pollTwoWay = polled ? Number(polled.democratic) / (Number(polled.democratic) + Number(polled.republicanVote)) * 100 : null;
    const democratic = polled
      ? Math.max(25, Math.min(75, pollTwoWay * 0.55 + environment * 0.20 + candidateRead * 0.25))
      : Math.max(25, Math.min(75, environment * 0.35 + candidateRead * 0.65));
    return {
      democratic: Number(democratic.toFixed(1)),
      republican: Number((100 - democratic).toFixed(1)),
      pollTwoWay: Number.isFinite(pollTwoWay) ? Number(pollTwoWay.toFixed(1)) : null,
      coverage: polled ? `${data.headToHeadPolling.source}, ${data.headToHeadPolling.fielded}` : null,
      isPoll: Boolean(polled)
    };
  };
  const options = list => list.map((candidate, index) => `<option value="${index}">${candidate.name}</option>`).join('');
  $('#market-list').innerHTML = `<section class="matchup-builder"><div class="builder-controls"><label><span>Choose a Democrat</span><select id="match-dem">${options(dems)}</select></label><span class="builder-versus">VS</span><label><span>Choose a Republican</span><select id="match-rep">${options(reps)}</select></label></div><div class="builder-stage"><article class="builder-candidate dem"><div class="builder-party">Democrat</div><img id="match-dem-photo" alt=""><h2 id="match-dem-name"></h2></article><div class="builder-center"><span>2028</span><strong>VS</strong><small>Your matchup</small></div><article class="builder-candidate rep"><div class="builder-party">Republican</div><img id="match-rep-photo" alt=""><h2 id="match-rep-name"></h2></article></div><div class="builder-score builder-score-hero"><div class="score-brand"><img src="/assets/the-bell-brand-mark-v4.png" alt="The Bell"><div><span id="estimate-label">The Bell matchup projection</span><strong id="estimate-line"><b id="estimate-dem-name"></b> <em id="estimate-dem"></em><i>vs.</i><b id="estimate-rep-name"></b> <em id="estimate-rep"></em></strong></div></div><div class="party-score" id="estimate-bar"><i class="dem" id="estimate-dem-bar"></i><i class="rep" id="estimate-rep-bar"></i></div><details class="estimate-method"><summary>What moves this projection</summary><p>A current head-to-head poll anchors 55% of a tested matchup. The national environment contributes 20%. Candidate strength contributes 25% through polling, campaign path, quality, coalition, sentiment, momentum, the economy, fragility, and separately tracked market evidence. Without a direct poll, the environment contributes 35% and candidate strength 65%.</p></details></div><div class="builder-bell"><div><span>National environment</span><strong>${partyCall?.ourCall || (demParty >= repParty ? 'Leans Democratic' : 'Leans Republican')}</strong><p>${partyCall?.whyShort || ''}</p></div><div class="bell-picks"><span>Current Democratic call <b>${demCall?.pickName || dems[0]?.name}</b></span><span>Current Republican call <b>${repCall?.pickName || reps[0]?.name}</b></span></div></div></section>`;
  const updateMatchup = () => {
    const dem = dems[Number($('#match-dem').value)] || dems[0];
    const rep = reps[Number($('#match-rep').value)] || reps[0];
    [['dem', dem], ['rep', rep]].forEach(([side, candidate]) => {
      $(`#match-${side}-photo`).src = candidate.photo || '';
      $(`#match-${side}-photo`).alt = candidate.name;
      $(`#match-${side}-name`).textContent = candidate.name;
    });
    const estimate = matchupEstimate(dem, rep);
    $('#estimate-dem-name').textContent = dem.name;
    $('#estimate-rep-name').textContent = rep.name;
    $('#estimate-dem').textContent = fmt(estimate.democratic);
    $('#estimate-rep').textContent = fmt(estimate.republican);
    $('#estimate-dem-bar').style.width = `${estimate.democratic}%`;
    $('#estimate-rep-bar').style.width = `${estimate.republican}%`;
    $('#estimate-label').textContent = 'The Bell matchup projection';
  };
  const demDefault = dems.findIndex(candidate => candidate.name === demCall?.pickName);
  const repDefault = reps.findIndex(candidate => candidate.name === repCall?.pickName);
  $('#match-dem').value = String(demDefault >= 0 ? demDefault : 0);
  $('#match-rep').value = String(repDefault >= 0 ? repDefault : 0);
  $('#match-dem').addEventListener('change', updateMatchup);
  $('#match-rep').addEventListener('change', updateMatchup);
  updateMatchup();
}

function renderLedger(entries) {
  const host = $('#ledger-body');
  if (!entries.length) {
    host.innerHTML = '<div class="empty-state"><strong>No big move yet.</strong><span>The ledger starts when the Bell crosses its reporting threshold.</span></div>';
    return;
  }
  host.innerHTML = `<div class="ledger-scroll"><table class="ledger-table"><thead><tr><th>Date</th><th>What changed</th><th>Previous</th><th>New call</th><th>Why it is here</th></tr></thead><tbody>${entries.slice().reverse().map(entry => `<tr><td>${shortDate(entry.timestamp)}</td><td><strong>${entry.label || 'Bell movement'}</strong></td><td>${entry.previous || (entry.previousDemocratic != null ? `D ${fmt(entry.previousDemocratic)}` : 'Not recorded')}</td><td>${entry.value || (entry.democratic != null ? `D ${fmt(entry.democratic)} / R ${fmt(entry.republican)}` : 'Not recorded')}</td><td>${entry.note || entry.source || ''}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderIssues(data) {
  const board = data.issueBoard || {};
  const issues = Array.isArray(board.issues) ? board.issues : [];
  const stamp = $('#issues-updated');
  if (stamp) stamp.textContent = updated(board.updatedAt || data.modelUpdatedAt || data.lastUpdated);
  if (!issues.length) return;

  const issueLabels = {
    'cost-of-living-economy': 'Affordability',
    'healthcare-costs': 'Healthcare',
    'trump-backlash': 'Trump',
    housing: 'Housing',
    'immigration-ice': 'Immigration & ICE',
    'coalition-energy-ideology': 'Party enthusiasm',
    'war-alliances-taxpayer': 'Israel, Palestine & U.S. policy',
    'national-debt-spending': 'National debt',
    'rights-culture': 'Abortion & civil rights',
    'money-political-influence': 'Money in politics'
  };
  const tone = value => {
    const text = String(value || '').toLowerCase();
    if (text.includes('democrat') || text.includes('left')) return 'democratic';
    if (text.includes('republican') || text.includes('right')) return 'republican';
    return 'neutral';
  };
  const floor = Math.min(...issues.map(issue => Number(issue.score) || 0));
  const ceiling = Math.max(...issues.map(issue => Number(issue.score) || 0));
  $('#issues-board').innerHTML = issues.map(issue => {
    const width = ceiling === floor ? 100 : 42 + (((Number(issue.score) || floor) - floor) / (ceiling - floor)) * 58;
    const label = issueLabels[issue.id] || issue.title;
    const currentRank = Number(issue.rank);
    const previousRank = Number.isFinite(Number(issue.previousRank)) ? Number(issue.previousRank) : currentRank;
    const rankChange = previousRank - currentRank;
    const changeClass = rankChange > 0 ? 'up' : rankChange < 0 ? 'down' : 'flat';
    const changeLabel = rankChange > 0
      ? `▲ ${rankChange}`
      : rankChange < 0
        ? `▼ ${Math.abs(rankChange)}`
        : '';
    return `<article class="issue-visual-row issue-tone-${tone(issue.partyAdvantage)} ${issue.rank <= 3 ? 'issue-top-three' : ''}">
      <div class="issue-visual-rank"><strong>${String(issue.rank).padStart(2, '0')}</strong>${changeLabel ? `<small class="${changeClass}" title="Previously ranked #${previousRank}">${changeLabel}</small>` : ''}</div>
      <div class="issue-visual-copy"><span class="issue-plain-label">${label}</span><h3>${issue.title}</h3><p>${issue.whyNow}</p></div>
      <div class="issue-visual-read"><span>${issue.movement}</span><strong>${issue.partyAdvantage}</strong><i style="--weight:${width}%"></i></div>
    </article>`;
  }).join('');
}

if (page === 'ledger') {
  fetch('/ledger.json', {cache: 'no-store'}).then(response => response.json()).then(renderLedger).catch(() => renderLedger([]));
} else {
  fetch('/site-data.json', {cache: 'no-store'}).then(response => response.json()).then(data => {
    if (page === 'forecast') renderForecast(data);
    if (page === 'candidates') renderCandidates(data);
    if (page === 'candidate') renderCandidateProfile(data);
    if (page === 'markets') renderMarkets(data);
    if (page === 'issues') renderIssues(data);
  }).catch(() => {
    const error = $('#data-error');
    if (error) error.textContent = 'The latest dataset could not be loaded. The published forecast is frozen.';
  });
}

function initModelSignals() {
  const network = document.querySelector('.model-network');
  if (!network) return;
  const nodes = [...document.querySelectorAll('.signal-node')];
  nodes.forEach(node => {
    const explanation = document.createElement('span');
    explanation.className = 'signal-description';
    explanation.textContent = node.dataset.description;
    node.append(explanation);
    node.setAttribute('aria-expanded', 'false');
    const setActive = active => {
      nodes.forEach(item => {
        const selected = active && item === node;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-expanded', String(selected));
      });
    };
    node.addEventListener('mouseenter', () => setActive(true));
    node.addEventListener('mouseleave', () => { if (document.activeElement !== node) setActive(false); });
    node.addEventListener('focus', () => setActive(true));
    node.addEventListener('blur', () => setActive(false));
    node.addEventListener('click', event => { event.stopPropagation(); setActive(!node.classList.contains('is-active')); });
  });
  document.addEventListener('click', () => nodes.forEach(node => node.classList.remove('is-active')));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') nodes.forEach(node => node.classList.remove('is-active')); });
}

initModelSignals();
