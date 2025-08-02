import { CategoryGrid } from "~/components/home/category-grid";
import { FeaturedServices } from "~/components/home/featured-services";
import { HeroSection } from "~/components/home/hero-section";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
	return (
		<HydrateClient>
			<main className="min-h-screen">
				<HeroSection />
				<CategoryGrid />
				<FeaturedServices />
			</main>
		</HydrateClient>
	);
}
