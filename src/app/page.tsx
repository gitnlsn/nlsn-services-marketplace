import { CategoryGrid } from "~/components/home/category-grid";
import { FeaturedServices } from "~/components/home/featured-services";
import { HeroSection } from "~/components/home/hero-section";
import { HowItWorks } from "~/components/home/how-it-works";
import { Section } from "~/components/ui/responsive-container";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
	return (
		<HydrateClient>
			<main className="min-h-screen bg-white">
				<HeroSection />

				<Section size="md" background="gray">
					<CategoryGrid />
				</Section>

				<Section size="md" background="white">
					<FeaturedServices />
				</Section>

				<Section size="lg" background="gray">
					<HowItWorks />
				</Section>
			</main>
		</HydrateClient>
	);
}
