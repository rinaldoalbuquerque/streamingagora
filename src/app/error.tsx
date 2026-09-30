'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell text-center">
      <h1 className="page-title">Não foi possível carregar os filmes</h1>
      <p className="mt-2 text-muted-foreground">
        O serviço de filmes pode estar instável. Tente novamente em instantes.
      </p>
      <Button className="mt-6 h-10 px-5" onClick={() => reset()}>
        Tentar de novo
      </Button>
    </div>
  );
}
