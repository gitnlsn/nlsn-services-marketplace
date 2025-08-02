// Simple text embedding service
// In a real implementation, this would use an AI model like OpenAI embeddings
// For now, we'll create a simple text-based embedding for development

export async function embedText(text: string): Promise<number[]> {
	// Normalize text
	const normalized = text.toLowerCase().trim();

	// In production, you would call an embedding API here
	// For example:
	// const response = await openai.embeddings.create({
	//   model: "text-embedding-ada-002",
	//   input: normalized,
	// });
	// return response.data[0].embedding;

	// For development, create a simple hash-based embedding
	const embedding = new Array(384).fill(0); // Standard embedding size

	// Simple feature extraction
	const words = normalized.split(/\s+/);
	const chars = normalized.split("");

	// Word-based features
	words.forEach((word, i) => {
		const hash = simpleHash(word);
		const index = Math.abs(hash) % embedding.length;
		embedding[index] += 1 / (i + 1); // Weight by position
	});

	// Character n-gram features
	for (let i = 0; i < chars.length - 2; i++) {
		const trigram = chars.slice(i, i + 3).join("");
		const hash = simpleHash(trigram);
		const index = Math.abs(hash) % embedding.length;
		embedding[index] += 0.5;
	}

	// Normalize the embedding
	const magnitude = Math.sqrt(
		embedding.reduce((sum, val) => sum + val * val, 0),
	);
	if (magnitude > 0) {
		for (let i = 0; i < embedding.length; i++) {
			embedding[i] /= magnitude;
		}
	}

	return embedding;
}

// Simple hash function for development
function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return hash;
}

// Generate embeddings for a service based on its title and description
export async function embedService(service: {
	title: string;
	description: string;
	category?: { name: string };
}): Promise<number[]> {
	// Combine relevant text fields
	const combinedText = [
		service.title,
		service.description,
		service.category?.name || "",
	].join(" ");

	return embedText(combinedText);
}
