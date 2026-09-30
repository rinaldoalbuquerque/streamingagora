'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { tmdbImageUrl } from '@/lib/tmdb/images';
import type { Provider } from '@/lib/tmdb/types';
import { saveProvidersAction } from '@/lib/user-data/actions';

export function ProviderPicker({ providers, initialSelected }: { providers: Provider[]; initialSelected: number[] }) {
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [isPending, startTransition] = useTransition();

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveProvidersAction([...selected].sort((a, b) => a - b));
      if (result.ok) toast.success('Streamings salvos!');
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => {
          const logo = tmdbImageUrl(provider.logoPath, 'w92');
          const id = `provider-${provider.id}`;
          return (
            <li key={provider.id} className="flex items-center gap-3 rounded-md border p-2">
              <input id={id} type="checkbox" checked={selected.has(provider.id)} onChange={() => toggle(provider.id)} />
              {logo && <Image src={logo} alt="" width={28} height={28} className="rounded" />}
              <label htmlFor={id} className="flex-1 cursor-pointer text-sm">{provider.name}</label>
            </li>
          );
        })}
      </ul>
      <Button onClick={save} disabled={isPending}>
        Salvar
      </Button>
    </div>
  );
}
