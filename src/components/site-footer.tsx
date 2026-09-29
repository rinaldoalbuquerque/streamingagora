export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-xs text-muted-foreground">
      <p>
        Dados de filmes fornecidos pelo{' '}
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline">
          TMDB
        </a>
        . Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
      </p>
      <p className="mt-1">
        Dados de disponibilidade em streaming fornecidos pelo{' '}
        <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer" className="underline">
          JustWatch
        </a>
        .
      </p>
    </footer>
  );
}
