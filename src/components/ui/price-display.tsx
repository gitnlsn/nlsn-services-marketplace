import { cn } from "~/lib/utils";

export type PriceType = "fixed" | "hourly" | "daily" | "monthly";
export type CurrencyCode = "BRL" | "USD" | "EUR";

interface PriceDisplayProps {
	amount: number;
	type?: PriceType;
	currency?: CurrencyCode;
	className?: string;
	showCurrencySymbol?: boolean;
	compact?: boolean;
}

const currencyConfig: Record<
	CurrencyCode,
	{ locale: string; currency: string }
> = {
	BRL: { locale: "pt-BR", currency: "BRL" },
	USD: { locale: "en-US", currency: "USD" },
	EUR: { locale: "en-EU", currency: "EUR" },
};

const priceTypeSuffix: Record<PriceType, string> = {
	fixed: "",
	hourly: "/hora",
	daily: "/dia",
	monthly: "/mês",
};

export function PriceDisplay({
	amount,
	type = "fixed",
	currency = "BRL",
	className,
	showCurrencySymbol = true,
	compact = false,
}: PriceDisplayProps) {
	const config = currencyConfig[currency];

	const formattedPrice = new Intl.NumberFormat(config.locale, {
		style: showCurrencySymbol ? "currency" : "decimal",
		currency: config.currency,
		minimumFractionDigits: compact ? 0 : 2,
		maximumFractionDigits: 2,
	}).format(amount);

	const suffix = priceTypeSuffix[type];

	return (
		<span className={cn("font-medium", className)}>
			{formattedPrice}
			{suffix}
		</span>
	);
}

// Helper function for backward compatibility
export function formatPrice(
	price: number,
	type: PriceType = "fixed",
	currency: CurrencyCode = "BRL",
): string {
	const config = currencyConfig[currency];

	const formatted = new Intl.NumberFormat(config.locale, {
		style: "currency",
		currency: config.currency,
	}).format(price);

	const suffix = priceTypeSuffix[type];
	return `${formatted}${suffix}`;
}

// Additional utility components
export function PriceRange({
	min,
	max,
	type = "fixed",
	currency = "BRL",
	className,
}: {
	min: number;
	max: number;
	type?: PriceType;
	currency?: CurrencyCode;
	className?: string;
}) {
	return (
		<span className={cn("font-medium", className)}>
			<PriceDisplay amount={min} type={type} currency={currency} compact /> -{" "}
			<PriceDisplay amount={max} type={type} currency={currency} compact />
		</span>
	);
}

export function DiscountedPrice({
	originalPrice,
	discountedPrice,
	type = "fixed",
	currency = "BRL",
	className,
}: {
	originalPrice: number;
	discountedPrice: number;
	type?: PriceType;
	currency?: CurrencyCode;
	className?: string;
}) {
	const discountPercentage = Math.round(
		((originalPrice - discountedPrice) / originalPrice) * 100,
	);

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<span className="text-gray-500 line-through">
				<PriceDisplay amount={originalPrice} type={type} currency={currency} />
			</span>
			<PriceDisplay
				amount={discountedPrice}
				type={type}
				currency={currency}
				className="font-semibold text-green-600"
			/>
			{discountPercentage > 0 && (
				<span className="rounded-full bg-green-100 px-2 py-1 text-green-800 text-xs">
					-{discountPercentage}%
				</span>
			)}
		</div>
	);
}
