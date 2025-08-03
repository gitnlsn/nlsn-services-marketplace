"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { BookingCard } from "~/components/booking/booking-card";
import { Loading } from "~/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

export default function BookingsPage() {
	const { data: session } = useSession();
	const [activeTab, setActiveTab] = useState<"client" | "provider">("client");

	const { data: user } = api.user.getCurrentUser.useQuery();

	const { data: clientBookings, isLoading: clientLoading } =
		api.booking.list.useQuery({
			role: "client",
			limit: 20,
		});

	const { data: providerBookings, isLoading: providerLoading } =
		api.booking.list.useQuery(
			{
				role: "provider",
				limit: 20,
			},
			{ enabled: user?.isProfessional === true },
		);

	if (clientLoading || (user?.isProfessional && providerLoading)) {
		return (
			<Loading
				className="min-h-screen"
				size="lg"
				text="Carregando agendamentos..."
			/>
		);
	}

	return (
		<main className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto px-4">
				<h1 className="mb-8 font-bold text-3xl text-gray-900">
					Meus Agendamentos
				</h1>

				{user?.isProfessional ? (
					<Tabs
						value={activeTab}
						onValueChange={(v) => setActiveTab(v as "client" | "provider")}
					>
						<TabsList className="mb-6">
							<TabsTrigger value="client">Como Cliente</TabsTrigger>
							<TabsTrigger value="provider">Como Profissional</TabsTrigger>
						</TabsList>

						<TabsContent value="client">
							<ClientBookings bookings={clientBookings?.bookings || []} />
						</TabsContent>

						<TabsContent value="provider">
							<ProviderBookings bookings={providerBookings?.bookings || []} />
						</TabsContent>
					</Tabs>
				) : (
					<ClientBookings bookings={clientBookings?.bookings || []} />
				)}
			</div>
		</main>
	);
}

interface BookingData {
	id: string;
	bookingDate: Date;
	endDate?: Date | null;
	status: string;
	totalPrice: number;
	notes?: string | null;
	address?: string | null;
	service: {
		id: string;
		title: string;
		images?: { url: string }[];
		category: { name: string };
	};
	client: {
		id: string;
		name?: string | null;
		image?: string | null;
	};
	provider: {
		id: string;
		name?: string | null;
		image?: string | null;
	};
}

function ClientBookings({ bookings }: { bookings: BookingData[] }) {
	const [filter, setFilter] = useState<string>("all");

	const filteredBookings = bookings.filter((booking) => {
		if (filter === "all") return true;
		return booking.status === filter;
	});

	return (
		<div>
			<div className="mb-6 flex gap-2">
				<FilterButton
					active={filter === "all"}
					onClick={() => setFilter("all")}
				>
					Todos
				</FilterButton>
				<FilterButton
					active={filter === "pending"}
					onClick={() => setFilter("pending")}
				>
					Pendentes
				</FilterButton>
				<FilterButton
					active={filter === "accepted"}
					onClick={() => setFilter("accepted")}
				>
					Aceitos
				</FilterButton>
				<FilterButton
					active={filter === "completed"}
					onClick={() => setFilter("completed")}
				>
					Concluídos
				</FilterButton>
				<FilterButton
					active={filter === "cancelled"}
					onClick={() => setFilter("cancelled")}
				>
					Cancelados
				</FilterButton>
			</div>

			{filteredBookings.length === 0 ? (
				<div className="py-12 text-center">
					<p className="text-gray-500">Nenhum agendamento encontrado.</p>
				</div>
			) : (
				<div className="grid gap-4">
					{filteredBookings.map((booking) => (
						<BookingCard
							key={booking.id}
							booking={{
								id: booking.id,
								bookingDate: booking.bookingDate.toISOString(),
								endDate: booking.endDate?.toISOString(),
								status: booking.status,
								totalPrice: booking.totalPrice,
								notes: booking.notes,
								address: booking.address,
								service: booking.service,
								client: booking.client,
								provider: booking.provider,
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function ProviderBookings({ bookings }: { bookings: BookingData[] }) {
	const [filter, setFilter] = useState<string>("all");

	const filteredBookings = bookings.filter((booking) => {
		if (filter === "all") return true;
		return booking.status === filter;
	});

	return (
		<div>
			<div className="mb-6 flex gap-2">
				<FilterButton
					active={filter === "all"}
					onClick={() => setFilter("all")}
				>
					Todos
				</FilterButton>
				<FilterButton
					active={filter === "pending"}
					onClick={() => setFilter("pending")}
				>
					Pendentes
				</FilterButton>
				<FilterButton
					active={filter === "accepted"}
					onClick={() => setFilter("accepted")}
				>
					Aceitos
				</FilterButton>
				<FilterButton
					active={filter === "completed"}
					onClick={() => setFilter("completed")}
				>
					Concluídos
				</FilterButton>
				<FilterButton
					active={filter === "cancelled"}
					onClick={() => setFilter("cancelled")}
				>
					Cancelados
				</FilterButton>
			</div>

			{filteredBookings.length === 0 ? (
				<div className="py-12 text-center">
					<p className="text-gray-500">Nenhum agendamento encontrado.</p>
				</div>
			) : (
				<div className="grid gap-4">
					{filteredBookings.map((booking) => (
						<BookingCard
							key={booking.id}
							booking={{
								id: booking.id,
								bookingDate: booking.bookingDate.toISOString(),
								endDate: booking.endDate?.toISOString(),
								status: booking.status,
								totalPrice: booking.totalPrice,
								notes: booking.notes,
								address: booking.address,
								service: booking.service,
								client: booking.client,
								provider: booking.provider,
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function FilterButton({
	children,
	active,
	onClick,
}: {
	children: React.ReactNode;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-lg px-4 py-2 font-medium text-sm transition-colors ${
				active
					? "bg-indigo-600 text-white"
					: "bg-white text-gray-700 hover:bg-gray-100"
			}`}
		>
			{children}
		</button>
	);
}
