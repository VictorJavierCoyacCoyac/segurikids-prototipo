import { SkeletonList } from "@/components/ui/feedback";

/** Estado de carga del panel administrativo. */
export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 w-64 animate-pulse rounded-2xl bg-ink-100" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-3xl bg-ink-100" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-3xl bg-ink-100 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
      </div>
      <SkeletonList rows={3} />
    </div>
  );
}
