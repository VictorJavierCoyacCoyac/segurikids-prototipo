import { Home, SearchX } from "lucide-react";

import { Logo } from "@/components/layout/brand";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-5 py-10">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" className="mb-8 justify-center" />

        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white text-ink-400 shadow-card">
          <SearchX className="h-8 w-8" aria-hidden="true" />
        </span>

        <h1 className="mt-5 text-2xl font-bold text-ink-900">No encontramos esta página</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          Es posible que el enlace haya cambiado, que el registro ya no exista o que no tengas
          permiso para consultarlo con tu rol actual.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/" size="lg">
            <Home className="h-5 w-5" />
            Volver al inicio
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
