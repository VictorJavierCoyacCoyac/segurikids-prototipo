import { FileText } from "lucide-react";

import { Alert } from "@/components/ui/feedback";
import {
  TERMS_SECTIONS,
  TERMS_UPDATED_AT,
  TERMS_VERSION,
} from "@/lib/domain/terms";
import { cn } from "@/lib/utils/cn";

/**
 * Texto de los términos y el aviso de privacidad.
 *
 * Lo comparten la pantalla pública (`/terminos`) y la de aceptación
 * obligatoria, de modo que el usuario firma exactamente el texto que puede
 * volver a consultar después.
 */
export function TermsDocument({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 ring-1 ring-brand-200">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Versión {TERMS_VERSION}
        </span>
        <span className="text-ink-500">Última actualización: {TERMS_UPDATED_AT}</span>
      </div>

      <Alert tone="warning" className="mb-5">
        <p className="font-semibold">Documento de prototipo</p>
        <p className="mt-0.5 leading-relaxed">
          Redacción orientativa de un prototipo académico, no revisada jurídicamente. Antes de
          cualquier uso real debe redactarla una persona con competencia legal y adaptarse a la
          normativa de protección de datos aplicable al centro.
        </p>
      </Alert>

      <div
        className={cn(
          "space-y-5",
          compact && "max-h-[22rem] overflow-y-auto rounded-2xl bg-ink-50 p-4",
        )}
      >
        {TERMS_SECTIONS.map((section) => (
          <section key={section.id} aria-labelledby={`terminos-${section.id}`}>
            <h2
              id={`terminos-${section.id}`}
              className="text-sm font-bold text-ink-900 sm:text-base"
            >
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-1.5 text-sm leading-relaxed text-ink-600">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-2 space-y-1.5">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm leading-snug text-ink-600"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
                      aria-hidden="true"
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
