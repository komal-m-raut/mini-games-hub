export default function Loading() {
  return (
    <div className="page-container flex-1 flex items-center justify-center py-24">
      <div
        className="w-12 h-12 rounded-full border-4 border-brand-purple/25 border-t-brand-cyan animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
