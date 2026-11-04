import { TriangleAlert } from "lucide-react";

export default function ApiNotice({ title, message }) {
  return (
    <div role="alert" className="mt-10 flex max-w-2xl gap-4 border-t-2 border-seal pt-5">
      <TriangleAlert className="mt-1 size-5 shrink-0 text-seal" aria-hidden="true" />
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-1 text-muted">{message}</p>
      </div>
    </div>
  );
}
