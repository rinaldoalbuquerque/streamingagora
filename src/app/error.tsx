'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <h2 className="text-xl font-semibold">Não foi possível carregar os filmes</h2>
      <p className="mt-2 text-muted-foreground">O serviço de filmes pode estar instável. Tente novamente em instantes.</p>
      <Button className="mt-4" onClick={() => reset()}>
        Tentar de novo
      </Button>
    </div>
  );
}
