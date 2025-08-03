import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export type StatusType = "booking" | "payment" | "service" | "withdrawal";

export type BookingStatus =
	| "pending"
	| "accepted"
	| "declined"
	| "completed"
	| "cancelled";
export type PaymentStatus =
	| "pending"
	| "processing"
	| "paid"
	| "failed"
	| "refunded"
	| "released";
export type ServiceStatus = "active" | "inactive" | "draft" | "under_review";
export type WithdrawalStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed";

type StatusConfig = {
	label: string;
	variant?: "default" | "secondary" | "destructive" | "outline";
	className?: string;
};

const bookingStatusConfig: Record<BookingStatus, StatusConfig> = {
	pending: {
		label: "Pendente",
		variant: "secondary",
		className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
	},
	accepted: {
		label: "Aceito",
		variant: "default",
		className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
	},
	declined: {
		label: "Recusado",
		variant: "destructive",
		className: "bg-red-100 text-red-800 hover:bg-red-100",
	},
	completed: {
		label: "Concluído",
		variant: "default",
		className: "bg-green-100 text-green-800 hover:bg-green-100",
	},
	cancelled: {
		label: "Cancelado",
		variant: "secondary",
		className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
	},
};

const paymentStatusConfig: Record<PaymentStatus, StatusConfig> = {
	pending: {
		label: "Pendente",
		variant: "secondary",
	},
	processing: {
		label: "Processando",
		variant: "secondary",
	},
	paid: {
		label: "Pago",
		variant: "default",
		className: "bg-green-100 text-green-800 hover:bg-green-100",
	},
	failed: {
		label: "Falhou",
		variant: "destructive",
	},
	refunded: {
		label: "Reembolsado",
		variant: "outline",
	},
	released: {
		label: "Liberado",
		variant: "default",
		className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
	},
};

const serviceStatusConfig: Record<ServiceStatus, StatusConfig> = {
	active: {
		label: "Ativo",
		className: "bg-green-100 text-green-800 hover:bg-green-100",
	},
	inactive: {
		label: "Inativo",
		variant: "secondary",
	},
	draft: {
		label: "Rascunho",
		variant: "outline",
	},
	under_review: {
		label: "Em Revisão",
		variant: "secondary",
		className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
	},
};

const withdrawalStatusConfig: Record<WithdrawalStatus, StatusConfig> = {
	pending: {
		label: "Pendente",
		variant: "secondary",
	},
	processing: {
		label: "Processando",
		variant: "secondary",
	},
	completed: {
		label: "Concluído",
		variant: "default",
	},
	failed: {
		label: "Falhou",
		variant: "destructive",
	},
};

interface StatusBadgeProps {
	status: string;
	type: StatusType;
	className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
	let config: StatusConfig | undefined;

	switch (type) {
		case "booking":
			config = bookingStatusConfig[status as BookingStatus];
			break;
		case "payment":
			config = paymentStatusConfig[status as PaymentStatus];
			break;
		case "service":
			config = serviceStatusConfig[status as ServiceStatus];
			break;
		case "withdrawal":
			config = withdrawalStatusConfig[status as WithdrawalStatus];
			break;
	}

	// Fallback for unknown statuses
	if (!config) {
		config = {
			label: status,
			variant: "outline",
		};
	}

	return (
		<Badge variant={config.variant} className={cn(config.className, className)}>
			{config.label}
		</Badge>
	);
}

// Helper function for backward compatibility
export function getStatusBadge(status: string, type: StatusType = "booking") {
	return <StatusBadge status={status} type={type} />;
}
