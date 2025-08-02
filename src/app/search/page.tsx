"use client";

import { useSearchParams } from "next/navigation";
import { SearchResults } from "~/components/search/search-results";

export default function SearchPage() {
	const searchParams = useSearchParams();
	const query = searchParams.get("q") || "";
	const category = searchParams.get("category") || "";

	return (
		<main className="min-h-screen bg-gray-50">
			<SearchResults initialQuery={query} initialCategory={category} />
		</main>
	);
}
