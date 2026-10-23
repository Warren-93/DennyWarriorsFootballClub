// Made-up players in the same shape as GET /api/v1/squad (PlayerResponse),
// used when the API is unreachable or has no squad yet.
const p = (id, name, number, position, appearances, goals, extra = {}) => ({
  id: `sample-${id}`,
  name,
  number,
  position,
  age: null,
  nationality: 'Scotland',
  profileImage: null,
  infoCard: null,
  goals,
  assists: 0,
  appearances,
  bio: null,
  captain: false,
  sponsorLogos: [],
  ...extra,
});

export const SAMPLE_SQUAD = [
  p(1, 'Callum Reid', 1, 'Goalkeeper', 24, 0),
  p(2, 'Jamie Forsyth', 21, 'Goalkeeper', 6, 0),
  p(3, 'Ross McLean', 2, 'Defender', 22, 1),
  p(4, 'Euan Baird', 5, 'Defender', 25, 3, { captain: true }),
  p(5, 'Kieran Doyle', 6, 'Defender', 23, 2),
  p(6, 'Liam Hendry', 3, 'Defender', 20, 0),
  p(7, 'Scott Galloway', 15, 'Defender', 11, 0),
  p(8, 'Fraser Duncan', 4, 'Midfielder', 24, 4),
  p(9, 'Connor Paterson', 8, 'Midfielder', 22, 6),
  p(10, 'Ryan Mackie', 7, 'Midfielder', 21, 5),
  p(11, 'Blair Simpson', 11, 'Midfielder', 19, 7),
  p(12, 'Dylan Hughes', 14, 'Midfielder', 12, 1),
  p(13, 'Lewis Cairns', 16, 'Midfielder', 9, 0),
  p(14, 'Aaron Wallace', 9, 'Forward', 25, 18),
  p(15, 'Marc Tennant', 10, 'Forward', 23, 11),
  p(16, 'Jordan Kerr', 17, 'Forward', 14, 4),
  p(17, 'Owen Brodie', 19, 'Forward', 8, 2),
  p(18, 'Ben Hastie', 12, 'Defender', 7, 0),
];

// Same fields the frontend reads from GET /api/v1/fixtures/next.
export const SAMPLE_FIXTURE = {
  id: 'sample-fixture',
  competition: 'League Cup',
  opponent: 'Sample Rovers',
  home: true,
  venue: 'Home ground',
  date: '2026-10-24T14:00:00Z',
  time: '15:00',
};
