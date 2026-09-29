const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export type ImageSize = 'w45' | 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280';

export function tmdbImageUrl(path: string | null, size: ImageSize): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}
