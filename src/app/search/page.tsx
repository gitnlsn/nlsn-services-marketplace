"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SearchResults } from "~/components/search/search-results";

function SearchContent() {
	const searchParams = useSearchParams();
	const query = searchParams.get("q") || "";
	const category = searchParams.get("category") || "";

	return (
		<main className="min-h-screen bg-gray-50">
			<SearchResults initialQuery={query} initialCategory={category} />
		</main>
	);
}

export default function SearchPage() {
	return (
		<Suspense
			fallback={
				<main className="min-h-screen bg-gray-50">
					<div className="container mx-auto px-4 py-8">
						<h1 className="font-bold text-2xl">Loading search results...</h1>
					</div>
				</main>
			}
		>
			<SearchContent />
		</Suspense>
	);
}
