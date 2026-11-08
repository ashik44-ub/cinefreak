import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDownloadLink {
  quality: string;
  size: string;
  host: string;
  url: string;
  /** Optional: link applies to one season/episode only (TV). Blank = whole title. */
  season?: number | null;
  episode?: number | null;
}

export interface ICastMember {
  name: string;
  character: string;
  profile: string;
}

export interface IEpisode {
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string;
  still: string;
  runtime: number | null;
}

export interface ISeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  episodes: IEpisode[];
}

export interface IMovie extends Document {
  imdbId: string;
  tmdbId: number | null;
  mediaType: "movie" | "tv";
  title: string;
  slug: string;
  overview: string;
  poster: string;
  backdrop: string;
  releaseDate: string;
  year: number | null;
  runtime: number | null;
  rating: number;
  genres: string[];
  cast: ICastMember[];
  trailerKey: string;
  downloadLinks: IDownloadLink[];
  seasons: ISeason[];
  numberOfSeasons: number;
  numberOfEpisodes: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DownloadLinkSchema = new Schema<IDownloadLink>(
  {
    quality: { type: String, required: true, trim: true },
    size: { type: String, default: "", trim: true },
    host: { type: String, default: "", trim: true },
    url: { type: String, required: true, trim: true },
    season: { type: Number, default: null },
    episode: { type: Number, default: null },
  },
  { _id: false },
);

const EpisodeSchema = new Schema<IEpisode>(
  {
    episodeNumber: { type: Number, required: true },
    name: { type: String, default: "" },
    overview: { type: String, default: "" },
    airDate: { type: String, default: "" },
    still: { type: String, default: "" },
    runtime: { type: Number, default: null },
  },
  { _id: false },
);

const SeasonSchema = new Schema<ISeason>(
  {
    seasonNumber: { type: Number, required: true },
    name: { type: String, default: "" },
    episodeCount: { type: Number, default: 0 },
    episodes: { type: [EpisodeSchema], default: [] },
  },
  { _id: false },
);

const CastSchema = new Schema<ICastMember>(
  {
    name: { type: String, required: true },
    character: { type: String, default: "" },
    profile: { type: String, default: "" },
  },
  { _id: false },
);

const MovieSchema = new Schema<IMovie>(
  {
    imdbId: { type: String, required: true, unique: true, trim: true },
    tmdbId: { type: Number, default: null },
    mediaType: { type: String, enum: ["movie", "tv"], default: "movie" },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    overview: { type: String, default: "" },
    poster: { type: String, default: "" },
    backdrop: { type: String, default: "" },
    releaseDate: { type: String, default: "" },
    year: { type: Number, default: null },
    runtime: { type: Number, default: null },
    rating: { type: Number, default: 0 },
    genres: { type: [String], default: [] },
    cast: { type: [CastSchema], default: [] },
    trailerKey: { type: String, default: "" },
    downloadLinks: { type: [DownloadLinkSchema], default: [] },
    seasons: { type: [SeasonSchema], default: [] },
    numberOfSeasons: { type: Number, default: 0 },
    numberOfEpisodes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

MovieSchema.index({ title: "text", overview: "text" });
MovieSchema.index({ genres: 1 });
MovieSchema.index({ createdAt: -1 });
MovieSchema.index({ rating: -1 });

export const Movie: Model<IMovie> =
  mongoose.models.Movie ?? mongoose.model<IMovie>("Movie", MovieSchema);
