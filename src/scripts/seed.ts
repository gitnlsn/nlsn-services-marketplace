import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	console.log("Starting database seeding...");

	// Create categories
	const categories = [
		"Limpeza e Organização",
		"Reparos e Manutenção",
		"Jardinagem e Paisagismo",
		"Pintura e Decoração",
		"Eletricista",
		"Encanador",
		"Marcenaria",
		"Aulas Particulares",
		"Informática e Tecnologia",
		"Beleza e Estética",
		"Fotografia",
		"Eventos e Festas",
		"Transporte e Mudanças",
		"Consultoria",
		"Design Gráfico",
		"Tradução",
		"Pet Services",
		"Culinária",
		"Fitness e Saúde",
		"Psicologia e Terapia",
	];

	console.log("Creating categories...");

	for (const categoryName of categories) {
		// Check if category already exists
		const existingCategory = await prisma.category.findFirst({
			where: {
				name: {
					equals: categoryName,
					mode: "insensitive",
				},
			},
		});

		if (!existingCategory) {
			await prisma.category.create({
				data: {
					name: categoryName,
				},
			});
			console.log(`Created category: ${categoryName}`);
		} else {
			console.log(`Category already exists: ${categoryName}`);
		}
	}

	console.log("Database seeding completed!");
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
