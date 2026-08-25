// Homepage editorial copy layer. Keeps the model data intact while giving the
// front-page call tiles a tighter, analyst-style voice for the current race.
(() => {
  const $ = selector => document.querySelector(selector);

  fetch('/site-data.json', { cache: 'no-store' })
    .then(response => response.json())
    .then(data => {
      const demCall = (data.calls || []).find(call => /Democratic nomination/i.test(call.question));
      const repCall = (data.calls || []).find(call => /Republican nomination/i.test(call.question));
      const presidentCall = (data.calls || []).find(call => /which party wins/i.test(call.question));
      const watch = data.powerRanking || {};

      // These edits are intentionally conditional. If the model changes its
      // picks or watch candidate, app.js remains the source of truth instead
      // of leaving stale editorial copy on the homepage.
      if (presidentCall?.ourCall === 'Leans Democratic') {
        $('#snapshot-president-copy').textContent = 'Democrats have the edge. The race is still competitive.';
      } else if (presidentCall?.ourCall === 'Leans Republican') {
        $('#snapshot-president-copy').textContent = 'Republicans have the edge. The race is still competitive.';
      }

      if (demCall?.pickName === 'Alexandria Ocasio-Cortez') {
        $('#snapshot-dem-copy').textContent = 'AOC has the energy. Buttigieg is the problem for that thesis.';
      }

      if (repCall?.pickName === 'JD Vance') {
        $('#snapshot-rep-copy').textContent = 'Vance leads. Rubio is close enough to matter.';
      }

      if (watch.candidateName === 'Pete Buttigieg' && watch.label === 'Dark horse') {
        $('#snapshot-watch-rating').textContent = 'Buttigieg is more than a dark horse';
        $('#snapshot-watch-copy').textContent = 'The model has him second. His early-state path is real.';
      }
    })
    .catch(() => {});
})();
