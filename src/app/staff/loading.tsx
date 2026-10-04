import { SkeletonList } from "@/components/ui/feedback";

/** Estado de carga del panel del personal escolar. */
export default function StaffLoading() {
  return (
    <div className="space-y-4">
      <div className="h-36 animate-pulse rounded-3xl bg-ink-100" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-3xl bg-ink-100" />
        ))}
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}
