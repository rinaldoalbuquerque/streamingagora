import Image from 'next/image';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Provider, WatchProviders } from '@/lib/tmdb/types';

function ProviderList({ title, items }: { title: string; items: Provider[] }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm text-muted-foreground">{title}</h3>
      <ul className="mt-2.5 space-y-2.5">
        {items.map((p) => {
          const logo = tmdbImageUrl(p.logoPath, 'w92');
          return (
            <li key={p.id} className="flex items-center gap-3 text-sm font-medium">
              {logo ? (
                <Image src={logo} alt="" width={40} height={40} className="rounded-lg" />
              ) : (
                <span aria-hidden className="size-10 rounded-lg bg-muted" />
              )}
              <span>{p.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WatchProvidersSection({ providers }: { providers: WatchProviders }) {
  const sections = [
    { title: 'Incluído na assinatura', items: providers.flatrate },
    { title: 'Aluguel', items: providers.rent },
    { title: 'Compra', items: providers.buy },
  ].filter((s) => s.items.length > 0);

  return (
    <section aria-labelledby="onde-assistir">
      <h2 id="onde-assistir" className="text-lg font-semibold sm:text-xl">
        Onde assistir
      </h2>
      {sections.length === 0 ? (
        <p className="mt-3 text-muted-foreground">
          Indisponível em streaming no Brasil no momento.
        </p>
      ) : (
        sections.map((s) => <ProviderList key={s.title} title={s.title} items={s.items} />)
      )}
      {providers.link && sections.length > 0 && (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          Ver todas as opções no TMDB
        </a>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Disponibilidade fornecida pelo JustWatch.
      </p>
    </section>
  );
}
