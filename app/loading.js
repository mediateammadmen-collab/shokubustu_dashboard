const block = "animate-pulse rounded-md bg-[var(--shade)]";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className={`${block} h-12 w-full max-w-xl`} />
      <div className="mt-6 grid grid-cols-2 gap-px lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-36`} />
        ))}
      </div>
      <div className={`${block} mt-8 h-44`} />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-[30rem]`} />
        ))}
      </div>
    </div>
  );
}
