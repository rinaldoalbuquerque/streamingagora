export const rawMatrix = {
  id: 603,
  title: 'Matrix',
  poster_path: '/matrix.jpg',
  release_date: '1999-03-30',
  vote_average: 8.2,
  overview: 'Um hacker descobre a verdade.',
};

export const rawNoPoster = {
  id: 1,
  title: 'Sem Pôster',
  poster_path: null,
  release_date: '',
  vote_average: 0,
  overview: '',
};

export function rawPage(results: unknown[], overrides: Record<string, unknown> = {}) {
  return { page: 1, total_pages: 1, total_results: results.length, results, ...overrides };
}

export const rawProvidersList = {
  results: [
    { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/prime.jpg', display_priority: 1, display_priorities: { BR: 2 } },
    { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 5, display_priorities: { BR: 1 } },
    { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/disney.jpg', display_priority: 3, display_priorities: { BR: 3 } },
  ],
};

const netflix = { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg', display_priority: 1 };
const appleTv = { provider_id: 2, provider_name: 'Apple TV', logo_path: '/apple.jpg', display_priority: 4 };

export const rawMatrixWatchProviders = {
  results: {
    BR: {
      link: 'https://www.themoviedb.org/movie/603/watch?locale=BR',
      flatrate: [netflix],
      ads: [netflix, { provider_id: 999, provider_name: 'Plataforma Grátis', logo_path: null, display_priority: 20 }],
      rent: [appleTv],
      buy: [appleTv],
    },
    US: { flatrate: [{ provider_id: 15, provider_name: 'Hulu', logo_path: null, display_priority: 1 }] },
  },
};

export const rawMatrixDetails = {
  ...rawMatrix,
  runtime: 136,
  tagline: 'Bem-vindo ao mundo real.',
  backdrop_path: '/backdrop.jpg',
  genres: [
    { id: 28, name: 'Ação' },
    { id: 878, name: 'Ficção científica' },
  ],
  credits: {
    cast: Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `Ator ${i + 1}`,
      character: `Personagem ${i + 1}`,
      profile_path: null,
    })),
  },
  videos: {
    results: [
      { key: 'en-trailer', site: 'YouTube', type: 'Trailer', iso_639_1: 'en' },
      { key: 'pt-teaser', site: 'YouTube', type: 'Teaser', iso_639_1: 'pt' },
      { key: 'pt-trailer', site: 'YouTube', type: 'Trailer', iso_639_1: 'pt' },
    ],
  },
  'watch/providers': rawMatrixWatchProviders,
};
