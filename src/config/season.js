// Grassroots seasons run late summer to spring, so the label rolls over on
// 1 July. Used where there's no synced Comet data to read the season from
// (the navbar, the squad page), so nobody has to edit it every year.
export function currentSeasonLabel(today = new Date()) {
  const startYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// Comet writes seasons as "2025/2026"; the site shows "2025/26".
export function formatSeason(season) {
  const match = /^(\d{4})\/\d{0,2}(\d{2})$/.exec(season?.trim() ?? '');
  return match ? `${match[1]}/${match[2]}` : season;
}
