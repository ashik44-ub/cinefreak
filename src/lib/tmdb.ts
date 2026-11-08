export interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  genres: { id: number; name: string }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
  };
  videos?: {
    results: {
      key: string;
      site: string;
      type: string;
      official: boolean;
    }[];
  };
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  episode_run_time: number[];
  vote_average: number;
  number_of_seasons: number;
  number_of_episodes: number;
  genres: { id: number; name: string }[];
  seasons: {
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
  }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
  };
  videos?: {
    results: {
      key: string;
      site: string;
      type: string;
      official: boolean;
    }[];
  };
}

export interface TmdbSeasonDetails {
  season_number: number;
  name: string;
  episodes: {
    episode_number: number;
    name: string;
    overview: string;
    air_date: string | null;
    still_path: string | null;
    runtime: number | null;
  }[];
}

const TMDB_BASE = "https://api.themoviedb.org/3";

function tmdbHeaders(): HeadersInit {
  // Prefer the v3 API key (query param, see tmdbGet). The bearer token is
  // only used when no API key is configured.
  if (process.env.TMDB_API_KEY) return { "Content-Type": "application/json" };
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_ACCESS_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function tmdbGet<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const apiKey = process.env.TMDB_API_KEY;
  const url = apiKey
    ? `${TMDB_BASE}${path}${sep}api_key=${apiKey}`
    : `${TMDB_BASE}${path}`;
  const res = await fetch(url, {
    headers: tmdbHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** Extract a bare IMDb id (tt1234567) from a full IMDb URL or a raw id. */
export function extractImdbId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/tt\d{7,8}/);
  return match ? match[0] : null;
}

export function imageUrl(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" | "w780" | "w1280" | "original" = "w500",
): string {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/** Find the TMDB movie id for an IMDb id, then fetch full details incl. cast + videos. */
export async function fetchMovieByImdbId(
  imdbId: string,
): Promise<TmdbMovieDetails> {
  const found = await tmdbGet<{
    movie_results: { id: number }[];
  }>(`/find/${imdbId}?external_source=imdb_id`);
  const tmdbId = found.movie_results?.[0]?.id;
  if (!tmdbId) {
    throw new Error(`No TMDB match found for IMDb id ${imdbId}`);
  }
  return fetchMovieByTmdbId(tmdbId);
}

export async function fetchMovieByTmdbId(
  tmdbId: number,
): Promise<TmdbMovieDetails> {
  return tmdbGet<TmdbMovieDetails>(
    `/movie/${tmdbId}?append_to_response=credits,videos`,
  );
}

export async function fetchTvByTmdbId(
  tmdbId: number,
): Promise<TmdbTvDetails> {
  return tmdbGet<TmdbTvDetails>(
    `/tv/${tmdbId}?append_to_response=credits,videos`,
  );
}

export async function fetchSeasonByTmdbId(
  tmdbId: number,
  seasonNumber: number,
): Promise<TmdbSeasonDetails> {
  return tmdbGet<TmdbSeasonDetails>(`/tv/${tmdbId}/season/${seasonNumber}`);
}

export interface TmdbFindResult {
  mediaType: "movie" | "tv";
  movie?: TmdbMovieDetails;
  tv?: TmdbTvDetails;
  seasons?: TmdbSeasonDetails[];
}

/**
 * Resolve an IMDb id to a movie OR a TV series via TMDB /find.
 * For series, every season's episode list is fetched as well.
 */
export async function fetchTitleByImdbId(
  imdbId: string,
): Promise<TmdbFindResult> {
  const found = await tmdbGet<{
    movie_results: { id: number }[];
    tv_results: { id: number }[];
  }>(`/find/${imdbId}?external_source=imdb_id`);

  const movieId = found.movie_results?.[0]?.id;
  if (movieId) {
    return { mediaType: "movie", movie: await fetchMovieByTmdbId(movieId) };
  }
  const tvId = found.tv_results?.[0]?.id;
  if (!tvId) {
    throw new Error(`No TMDB match found for IMDb id ${imdbId}`);
  }
  const tv = await fetchTvByTmdbId(tvId);
  // Fetch episodes for every numbered season (season 0 = Specials is
  // skipped — on TMDB it holds hundreds of featurettes, not episodes).
  const seasonList = (tv.seasons ?? []).filter(
    (s) => s.season_number > 0 && s.episode_count > 0,
  );
  const seasons = await Promise.all(
    seasonList.map((s) => fetchSeasonByTmdbId(tvId, s.season_number)),
  );
  return { mediaType: "tv", tv, seasons };
}

export function pickTrailerKey(
  details: TmdbMovieDetails | TmdbTvDetails,
): string {
  const videos = details.videos?.results ?? [];
  const trailer =
    videos.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official,
    ) ??
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube" && v.type === "Teaser");
  return trailer?.key ?? "";
}

export interface EpisodePreview {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string;
  still: string;
  runtime: number | null;
}

export interface SeasonPreview {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  episodes: EpisodePreview[];
}

export interface MoviePreview {
  imdbId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  poster: string;
  backdrop: string;
  releaseDate: string;
  year: number | null;
  runtime: number | null;
  rating: number;
  genres: string[];
  cast: { name: string; character: string; profile: string }[];
  trailerKey: string;
  seasons: SeasonPreview[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
}

function cleanCast(
  cast: { name?: string; character?: string; profile_path?: string | null }[] = [],
): { name: string; character: string; profile: string }[] {
  // Drop cast entries with no usable name — a nameless entry crashed the
  // detail page (c.name.charAt) and must never be saved.
  return cast
    .filter((c) => c.name && c.name.trim())
    .slice(0, 12)
    .map((c) => ({
      name: c.name!.trim(),
      character: c.character ?? "",
      profile: imageUrl(c.profile_path, "w185"),
    }));
}

export function toPreview(imdbId: string, d: TmdbMovieDetails): MoviePreview {
  const releaseDate = d.release_date || "";
  return {
    imdbId,
    tmdbId: d.id,
    mediaType: "movie",
    title: d.title,
    overview: d.overview,
    poster: imageUrl(d.poster_path, "w500"),
    backdrop: imageUrl(d.backdrop_path, "w1280"),
    releaseDate,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    runtime: d.runtime ?? null,
    rating: Math.round((d.vote_average ?? 0) * 10) / 10,
    genres: (d.genres ?? []).map((g) => g.name),
    cast: cleanCast(d.credits?.cast ?? []),
    trailerKey: pickTrailerKey(d),
    seasons: [],
    numberOfSeasons: 0,
    numberOfEpisodes: 0,
  };
}

export function toSeriesPreview(
  imdbId: string,
  d: TmdbTvDetails,
  seasonDetails: TmdbSeasonDetails[],
): MoviePreview {
  const releaseDate = d.first_air_date || "";
  const seasons: SeasonPreview[] = seasonDetails.map((s) => ({
    seasonNumber: s.season_number,
    name: s.name || `Season ${s.season_number}`,
    episodeCount: s.episodes.length,
    episodes: s.episodes.map((e) => ({
      episodeNumber: e.episode_number,
      name: e.name || `Episode ${e.episode_number}`,
      overview: e.overview ?? "",
      airDate: e.air_date ?? "",
      still: imageUrl(e.still_path, "w500"),
      runtime: e.runtime ?? null,
    })),
  }));
  return {
    imdbId,
    tmdbId: d.id,
    mediaType: "tv",
    title: d.name,
    overview: d.overview,
    poster: imageUrl(d.poster_path, "w500"),
    backdrop: imageUrl(d.backdrop_path, "w1280"),
    releaseDate,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    runtime: d.episode_run_time?.[0] ?? null,
    rating: Math.round((d.vote_average ?? 0) * 10) / 10,
    genres: (d.genres ?? []).map((g) => g.name),
    cast: cleanCast(d.credits?.cast ?? []),
    trailerKey: pickTrailerKey(d),
    seasons,
    numberOfSeasons: d.number_of_seasons ?? seasons.length,
    numberOfEpisodes:
      d.number_of_episodes ??
      seasons.reduce((n, s) => n + s.episodes.length, 0),
  };
}

/** One-call import: resolves an IMDb id to a movie or series preview. */
export async function fetchPreviewByImdbId(
  imdbId: string,
): Promise<MoviePreview> {
  const found = await fetchTitleByImdbId(imdbId);
  if (found.mediaType === "movie" && found.movie) {
    return toPreview(imdbId, found.movie);
  }
  if (found.mediaType === "tv" && found.tv) {
    return toSeriesPreview(imdbId, found.tv, found.seasons ?? []);
  }
  throw new Error(`No TMDB match found for IMDb id ${imdbId}`);
}
