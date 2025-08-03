import { cn } from "~/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
	title: string;
	description?: string;
	icon?: React.ReactNode;
	action?: {
		label: string;
		onClick: () => void;
	};
	className?: string;
}

export function EmptyState({
	title,
	description,
	icon,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center py-12 text-center",
				className,
			)}
		>
			{icon && (
				<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
					{icon}
				</div>
			)}

			<h3 className="mb-2 font-semibold text-gray-900 text-lg">{title}</h3>

			{description && (
				<p className="mb-6 max-w-sm text-gray-600">{description}</p>
			)}

			{action && <Button onClick={action.onClick}>{action.label}</Button>}
		</div>
	);
}

// Predefined empty states for common scenarios
export function NoSearchResults({
	searchTerm,
	onClearFilters,
}: {
	searchTerm?: string;
	onClearFilters?: () => void;
}) {
	return (
		<EmptyState
			icon={
				<svg
					className="h-8 w-8 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					role="img"
					aria-label="Search icon"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			}
			title="Nenhum resultado encontrado"
			description={
				searchTerm
					? `Não encontramos resultados para "${searchTerm}". Tente usar palavras-chave diferentes ou ajustar os filtros.`
					: "Não encontramos resultados. Tente ajustar os filtros ou usar palavras-chave diferentes."
			}
			action={
				onClearFilters
					? {
							label: "Limpar filtros",
							onClick: onClearFilters,
						}
					: undefined
			}
		/>
	);
}

export function NoBookings({
	userType = "customer",
	onCreateBooking,
}: {
	userType?: "customer" | "provider";
	onCreateBooking?: () => void;
}) {
	const isCustomer = userType === "customer";

	return (
		<EmptyState
			icon={
				<svg
					className="h-8 w-8 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					role="img"
					aria-label="Search icon"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z"
					/>
				</svg>
			}
			title={isCustomer ? "Nenhum agendamento ainda" : "Nenhuma reserva ainda"}
			description={
				isCustomer
					? "Você ainda não fez nenhum agendamento. Explore nossos serviços e faça sua primeira reserva!"
					: "Você ainda não recebeu nenhuma reserva. Certifique-se de que seus serviços estão ativos e bem descritos."
			}
			action={
				onCreateBooking
					? {
							label: isCustomer ? "Encontrar serviços" : "Gerenciar serviços",
							onClick: onCreateBooking,
						}
					: undefined
			}
		/>
	);
}

export function NoServices({
	onCreateService,
}: {
	onCreateService?: () => void;
}) {
	return (
		<EmptyState
			icon={
				<svg
					className="h-8 w-8 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					role="img"
					aria-label="Search icon"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 6v6m0 0v6m0-6h6m-6 0H6"
					/>
				</svg>
			}
			title="Nenhum serviço criado"
			description="Você ainda não criou nenhum serviço. Comece criando seu primeiro serviço para começar a receber clientes."
			action={
				onCreateService
					? {
							label: "Criar primeiro serviço",
							onClick: onCreateService,
						}
					: undefined
			}
		/>
	);
}

export function NoReviews() {
	return (
		<EmptyState
			icon={
				<svg
					className="h-8 w-8 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					role="img"
					aria-label="Search icon"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
					/>
				</svg>
			}
			title="Nenhuma avaliação ainda"
			description="Este serviço ainda não recebeu avaliações. Seja o primeiro a avaliar!"
		/>
	);
}

export function NoMessages({
	onStartConversation,
}: {
	onStartConversation?: () => void;
}) {
	return (
		<EmptyState
			icon={
				<svg
					className="h-8 w-8 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					role="img"
					aria-label="Search icon"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			}
			title="Nenhuma conversa ainda"
			description="Você ainda não iniciou nenhuma conversa. Entre em contato com profissionais para esclarecer dúvidas sobre os serviços."
			action={
				onStartConversation
					? {
							label: "Explorar serviços",
							onClick: onStartConversation,
						}
					: undefined
			}
		/>
	);
}

export function ErrorState({
	title = "Algo deu errado",
	description = "Ocorreu um erro inesperado. Tente novamente ou recarregue a página.",
	onRetry,
}: {
	title?: string;
	description?: string;
	onRetry?: () => void;
}) {
	return (
		<EmptyState
			icon={
				<svg
					className="h-8 w-8 text-red-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					role="img"
					aria-label="Error icon"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.232 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			}
			title={title}
			description={description}
			action={
				onRetry
					? {
							label: "Tentar novamente",
							onClick: onRetry,
						}
					: undefined
			}
			className="text-red-900"
		/>
	);
}
