import { requireAdminPage } from "@/lib/require-admin-page";
import MovieForm, { emptyForm } from "@/components/MovieForm";

export const dynamic = "force-dynamic";

export default async function NewMoviePage() {
  await requireAdminPage();
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-black">
        Add <span className="text-accent">Movie</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Import from IMDb or fill in the details manually.
      </p>
      <div className="mt-6">
        <MovieForm initial={emptyForm} mode="new" />
      </div>
    </div>
  );
}
