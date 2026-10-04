import { SkeletonList } from "@/components/ui/feedback";

/** Estado de carga de la app familiar. */
export default function ParentLoading() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-3xl bg-ink-100" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-3xl bg-ink-100" />
        <div className="h-28 animate-pulse rounded-3xl bg-ink-100" />
      </div>
      <SkeletonList rows={3} />
    </div>
  );
}
