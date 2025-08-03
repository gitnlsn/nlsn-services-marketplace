import { Calendar, Clock } from "~/components/ui/icon";
import { cn } from "~/lib/utils";

export type DateFormat =
	| "short"
	| "long"
	| "full"
	| "relative"
	| "time"
	| "datetime"
	| "monthYear";

interface DateDisplayProps {
	date: Date | string | null;
	format?: DateFormat;
	locale?: string;
	className?: string;
	showIcon?: boolean;
	fallback?: string;
}

const formatOptions: Record<DateFormat, Intl.DateTimeFormatOptions> = {
	short: {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	},
	long: {
		day: "numeric",
		month: "long",
		year: "numeric",
	},
	full: {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	},
	relative: {}, // Special handling
	time: {
		hour: "2-digit",
		minute: "2-digit",
	},
	datetime: {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	},
	monthYear: {
		month: "long",
		year: "numeric",
	},
};

export function DateDisplay({
	date,
	format = "short",
	locale = "pt-BR",
	className,
	showIcon = false,
	fallback = "Data não disponível",
}: DateDisplayProps) {
	if (!date) {
		return <span className={cn("text-gray-500", className)}>{fallback}</span>;
	}

	const dateObj = typeof date === "string" ? new Date(date) : date;

	// Handle invalid dates
	if (Number.isNaN(dateObj.getTime())) {
		return <span className={cn("text-gray-500", className)}>{fallback}</span>;
	}

	let formattedDate: string;

	if (format === "relative") {
		formattedDate = getRelativeTimeString(dateObj, locale);
	} else {
		formattedDate = new Intl.DateTimeFormat(
			locale,
			formatOptions[format],
		).format(dateObj);
	}

	const Icon = format === "time" || format === "datetime" ? Clock : Calendar;

	return (
		<span className={cn("inline-flex items-center gap-1", className)}>
			{showIcon && <Icon className="h-4 w-4 text-gray-400" />}
			{formattedDate}
		</span>
	);
}

// Helper function for relative time
function getRelativeTimeString(date: Date, locale = "pt-BR"): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	const diffInHours = Math.floor(diffInMinutes / 60);
	const diffInDays = Math.floor(diffInHours / 24);

	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

	if (diffInDays > 7) {
		// For dates older than 7 days, show the actual date
		return new Intl.DateTimeFormat(locale, formatOptions.short).format(date);
	}
	if (diffInDays >= 1) {
		return rtf.format(-diffInDays, "day");
	}
	if (diffInHours >= 1) {
		return rtf.format(-diffInHours, "hour");
	}
	if (diffInMinutes >= 1) {
		return rtf.format(-diffInMinutes, "minute");
	}
	return rtf.format(-diffInSeconds, "second");
}

// Helper function for backward compatibility
export function formatDate(
	date: Date | string,
	format: DateFormat = "short",
	locale = "pt-BR",
): string {
	if (!date) return "";

	const dateObj = typeof date === "string" ? new Date(date) : date;

	if (Number.isNaN(dateObj.getTime())) return "";

	if (format === "relative") {
		return getRelativeTimeString(dateObj, locale);
	}

	return new Intl.DateTimeFormat(locale, formatOptions[format]).format(dateObj);
}

// Additional utility components
export function DateRange({
	startDate,
	endDate,
	format = "short",
	locale = "pt-BR",
	className,
	separator = " - ",
}: {
	startDate: Date | string | null;
	endDate: Date | string | null;
	format?: DateFormat;
	locale?: string;
	className?: string;
	separator?: string;
}) {
	return (
		<span className={cn("inline-flex items-center", className)}>
			<DateDisplay date={startDate} format={format} locale={locale} />
			{startDate && endDate && separator}
			{endDate && (
				<DateDisplay date={endDate} format={format} locale={locale} />
			)}
		</span>
	);
}

export function TimeAgo({
	date,
	locale = "pt-BR",
	className,
	showIcon = false,
}: {
	date: Date | string | null;
	locale?: string;
	className?: string;
	showIcon?: boolean;
}) {
	return (
		<DateDisplay
			date={date}
			format="relative"
			locale={locale}
			className={className}
			showIcon={showIcon}
		/>
	);
}

export function DateTime({
	date,
	locale = "pt-BR",
	className,
	showDate = true,
	showTime = true,
	separator = " às ",
}: {
	date: Date | string | null;
	locale?: string;
	className?: string;
	showDate?: boolean;
	showTime?: boolean;
	separator?: string;
}) {
	if (!date) return null;

	return (
		<span className={cn("inline-flex items-center", className)}>
			{showDate && <DateDisplay date={date} format="short" locale={locale} />}
			{showDate && showTime && separator}
			{showTime && <DateDisplay date={date} format="time" locale={locale} />}
		</span>
	);
}
