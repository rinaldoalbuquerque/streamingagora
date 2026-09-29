import Image from 'next/image';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Provider, WatchProviders } from '@/lib/tmdb/types';

function ProviderList({ title, items }: { title: string; items: Provider[] }) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="mt-2 flex flex-wrap gap-3">
        {items.map((p) => {
          const logo = tmdbImageUrl(p.logoPath, 'w92');
          return (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              {logo && <Image src={logo} alt="" width={32} height={32} className="rounded" />}
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
      <h2 id="onde-assistir" className="text-lg font-semibold">Onde assistir</h2>
      {sections.length === 0 ? (
        <p className="mt-2 text-muted-foreground">Indisponível em streaming no Brasil no momento.</p>
      ) : (
        sections.map((s) => <ProviderList key={s.title} title={s.title} items={s.items} />)
      )}
      {providers.link && sections.length > 0 && (
        <a href={providers.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm underline">
          Ver todas as opções no TMDB
        </a>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Disponibilidade fornecida pelo JustWatch.</p>
    </section>
  );
}
