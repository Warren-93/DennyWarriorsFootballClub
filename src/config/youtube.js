// Denny Warriors FC's YouTube channel (youtube.com/@dennywarriorsfc6565).
// Update CHANNEL_ID here if the club ever changes channels — everything else
// on the Media page derives from it, no other code needs to change.
export const YOUTUBE_CHANNEL_ID = 'UCg6mRZeKtfdeP8dFTgPszMw';

// YouTube convention: swapping the "UC" prefix for "UU" gives the channel's
// "uploads" playlist ID, which the standard embed player can browse as a
// full playlist (i.e. "all videos") without needing the Data API/an API key.
export const YOUTUBE_UPLOADS_PLAYLIST_ID = `UU${YOUTUBE_CHANNEL_ID.slice(2)}`;
