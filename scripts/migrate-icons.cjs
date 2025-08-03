#!/usr/bin/env node

/**
 * Icon Migration Script
 * Migrates Heroicons imports to unified icon system
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// Icon mapping from Heroicons to Lucide equivalents
const iconMappings = {
	// Navigation
	ChevronLeftIcon: "ChevronLeft",
	ChevronRightIcon: "ChevronRight",
	ChevronDownIcon: "ChevronDown",
	ChevronUpIcon: "ChevronUp",
	ArrowLeftIcon: "ArrowLeft",
	ArrowRightIcon: "ArrowRight",

	// Actions
	XMarkIcon: "X",
	CheckIcon: "Check",
	PlusIcon: "Plus",
	MinusIcon: "Minus",
	TrashIcon: "Delete",
	PencilIcon: "Edit",

	// UI Elements
	MagnifyingGlassIcon: "Search",
	FunnelIcon: "Filter",
	EyeIcon: "Eye",
	EyeSlashIcon: "EyeOff",
	Cog6ToothIcon: "Settings",
	CogIcon: "Settings",
	Bars3Icon: "Menu",
	CalendarIcon: "Calendar",
	ClockIcon: "Clock",
	BellIcon: "Bell",

	// Location & Maps
	MapPinIcon: "MapPin",
	HomeIcon: "Home",
	BuildingOfficeIcon: "Building",

	// Communication
	EnvelopeIcon: "Mail",
	PhoneIcon: "Phone",
	ChatBubbleLeftIcon: "MessageCircle",
	PaperAirplaneIcon: "Send",
	ShareIcon: "Share",
	LinkIcon: "Link",

	// Ratings & Feedback
	StarIcon: "Star",
	HeartIcon: "Heart",
	HandThumbUpIcon: "ThumbsUp",

	// File & Media
	ArrowUpTrayIcon: "Upload",
	ArrowDownTrayIcon: "Download",
	DocumentIcon: "File",
	PhotoIcon: "Image",
	CameraIcon: "Camera",
	PaperClipIcon: "Attachment",

	// Status & Feedback
	CheckCircleIcon: "Success",
	XCircleIcon: "Error",
	ExclamationTriangleIcon: "Warning",
	InformationCircleIcon: "Info",
	QuestionMarkCircleIcon: "Help",

	// Business & Commerce
	CreditCardIcon: "CreditCard",
	CurrencyDollarIcon: "Money",
	ShoppingCartIcon: "Cart",
	TruckIcon: "Delivery",
	BriefcaseIcon: "Service",

	// System & Network
	WifiIcon: "Wifi",
	BoltIcon: "Lightning",
	LockClosedIcon: "Lock",
	LockOpenIcon: "Unlock",
	ArrowPathIcon: "Refresh",
};

// Files that have been already migrated
const migratedFiles = [
	"src/components/booking/booking-modal.tsx",
	"src/components/services/service-card.tsx",
	"src/components/home/hero-section.tsx",
	"src/components/ui/date-display.tsx",
	"src/components/review/review-form.tsx",
	"src/components/services/services-grid.tsx",
];

function findHeroiconFiles() {
	try {
		const result = execSync(
			'grep -r "from.*@heroicons" src/ --include="*.tsx" --include="*.ts" -l',
			{ encoding: "utf8" },
		);
		return result.trim().split("\n").filter(Boolean);
	} catch (error) {
		console.log("No Heroicon imports found");
		return [];
	}
}

function getHeroiconImports(filePath) {
	const content = fs.readFileSync(filePath, "utf8");
	const importRegex =
		/import\s+{([^}]+)}\s+from\s+["']@heroicons\/react\/24\/(outline|solid)["'];?/g;
	const imports = [];
	let match;

	while ((match = importRegex.exec(content)) !== null) {
		const iconList = match[1]
			.split(",")
			.map((icon) => icon.trim().replace(/\s+as\s+\w+/, ""));
		imports.push({
			icons: iconList,
			type: match[2], // outline or solid
			fullMatch: match[0],
		});
	}

	return imports;
}

function generateMigrationSummary() {
	const files = findHeroiconFiles();
	console.log("🔍 Icon Migration Analysis\n");
	console.log("========================\n");

	console.log(`📁 Files with Heroicons: ${files.length}\n`);

	const iconUsage = {};

	files.forEach((file) => {
		console.log(`📄 ${file}`);
		const imports = getHeroiconImports(file);

		imports.forEach(({ icons, type }) => {
			icons.forEach((icon) => {
				if (!iconUsage[icon]) {
					iconUsage[icon] = { outline: 0, solid: 0, files: [] };
				}
				iconUsage[icon][type]++;
				if (!iconUsage[icon].files.includes(file)) {
					iconUsage[icon].files.push(file);
				}
			});
		});

		imports.forEach(({ icons, type }) => {
			console.log(`  └─ ${type}: ${icons.join(", ")}`);
		});
		console.log("");
	});

	console.log("\n📊 Icon Usage Summary:");
	console.log("=====================\n");

	Object.entries(iconUsage).forEach(([icon, usage]) => {
		const mapped = iconMappings[icon] || "❓ UNMAPPED";
		const total = usage.outline + usage.solid;
		console.log(`${icon.padEnd(25)} → ${mapped.padEnd(20)} (${total} uses)`);
	});

	console.log("\n✅ Already Migrated:");
	console.log("===================\n");
	migratedFiles.forEach((file) => {
		console.log(`✓ ${file}`);
	});

	console.log("\n📋 Migration Status:");
	console.log("===================\n");
	const remaining = files.filter((f) => !migratedFiles.includes(f));
	console.log(`✅ Migrated: ${migratedFiles.length} files`);
	console.log(`⏳ Remaining: ${remaining.length} files`);

	if (remaining.length > 0) {
		console.log("\n🔧 Next files to migrate:");
		remaining.slice(0, 5).forEach((file) => {
			console.log(`   • ${file}`);
		});
		if (remaining.length > 5) {
			console.log(`   • ... and ${remaining.length - 5} more`);
		}
	}
}

// Run the analysis
generateMigrationSummary();
