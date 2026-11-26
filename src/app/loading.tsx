export default function Loading() {
  return (
    <div className="wrap py-10 sm:py-16" aria-busy="true" aria-live="polite">
      <div className="skeleton mb-6 h-8 w-48" />
      <div className="skeleton mb-4 h-4 w-full max-w-2xl" />
      <div className="skeleton mb-2 h-4 w-full max-w-xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-40" />
        ))}
      </div>
    </div>
  );
}
