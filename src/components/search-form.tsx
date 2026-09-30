import { Search } from 'lucide-react';

/** Campo de busca grande da página /busca (no celular, o cabeçalho só mostra o ícone). */
export function SearchForm() {
  return (
    <form action="/busca" role="search" className="relative mt-8 max-w-2xl">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        name="q"
        autoFocus
        placeholder="Nome do filme"
        aria-label="Buscar filme por título"
        className="h-14 w-full rounded-md border border-input bg-card pr-28 pl-12 text-lg outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <button
        type="submit"
        className="absolute top-2 right-2 h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        Buscar
      </button>
    </form>
  );
}
