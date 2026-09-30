export interface Movie {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
  overview: string;
}

export interface Paginated<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface Provider {
  id: number;
  name: string;
  logoPath: string | null;
  displayPriority: number;
}

/** `flatrate` junta assinatura, grátis e com anúncios. */
export interface WatchProviders {
  link: string | null;
  flatrate: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export interface CastMember {
  id: number;
  name: string;
  character: string | null;
  profilePath: string | null;
}

export interface MovieDetails extends Movie {
  runtime: number | null;
  tagline: string | null;
  genres: Genre[];
  cast: CastMember[];
  trailerKey: string | null;
  watchProviders: WatchProviders;
}
