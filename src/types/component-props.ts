// Component props types derived from Prisma models and service layer
import type { Booking, Review, Service, User } from "@prisma/client";

// Service-related component props (derived from Prisma Service model)
export interface ServiceCardProps {
	service: Service & {
		provider: Pick<User, "id" | "name" | "image">;
		_count?: {
			reviews: number;
			bookings: number;
		};
		avgRating?: number;
	};
}

export interface ServiceDetailProps {
	service: Service & {
		provider: Pick<User, "id" | "name" | "image" | "bio">;
		category: {
			id: string;
			name: string;
		};
		reviews: Array<
			Review & {
				user: Pick<User, "name" | "image">;
			}
		>;
		_count: {
			reviews: number;
			bookings: number;
		};
		avgRating: number;
	};
}

// Booking-related component props (derived from Prisma Booking model)
export interface BookingModalProps {
	isOpen: boolean;
	onClose: () => void;
	service: Pick<
		Service,
		"id" | "title" | "price" | "priceType" | "duration" | "location"
	> & {
		provider: Pick<User, "name" | "image">;
	};
}

export interface BookingCardProps {
	booking: Booking & {
		service: Pick<Service, "id" | "title" | "price">;
		client: Pick<User, "name" | "image">;
		provider: Pick<User, "name" | "image">;
	};
}

// Review-related component props (derived from Prisma Review model)
export interface ReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	serviceId: string;
	bookingId?: string;
	serviceName: string;
}

export interface ReviewFormProps {
	serviceId: string;
	bookingId?: string;
	onSubmit: (data: {
		rating: number;
		comment: string;
	}) => Promise<void>;
}

// Dashboard component props (derived from service layer aggregations)
export interface CustomerDashboardProps {
	user: Pick<User, "id" | "name" | "email" | "image">;
}

export interface ProfessionalDashboardProps {
	user: Pick<User, "id" | "name" | "email" | "image" | "isProfessional">;
}

// Messaging component props (derived from future messaging models)
export interface MessagingInterfaceProps {
	initialConversationId?: string;
}

// Map component props (geographic data)
export interface MapViewProps {
	services: Array<Pick<Service, "id" | "title" | "price" | "location">>;
	center?: { lat: number; lng: number };
	zoom?: number;
}

// Settings component props (user preferences)
export interface CommunicationSettingsProps {
	userId: string;
}

export interface NotificationPreferencesProps {
	userId: string;
	preferences: {
		email: boolean;
		sms: boolean;
		whatsapp: boolean;
		push: boolean;
	};
}

export interface AvailabilitySettingsProps {
	providerId: string;
}

// Service management props (admin/professional only)
export interface ServiceManagementProps {
	userId: string;
	isProfessional: boolean;
}

export interface ServiceFormProps {
	service?: Service;
	onSubmit: (data: Partial<Service>) => Promise<void>;
}

// Profile component props
export interface ProfileEditFormProps {
	user: User;
	onSubmit: (data: Partial<User>) => Promise<void>;
}

export interface PublicProfileProps {
	user: User & {
		services: Array<
			Service & {
				_count: { reviews: number };
				avgRating: number;
			}
		>;
		reviews: Array<
			Review & {
				service: Pick<Service, "title">;
				user: Pick<User, "name" | "image">;
			}
		>;
	};
}

// Availability component props (calendar integration)
export interface AvailabilityCalendarProps {
	providerId: string;
	serviceId?: string;
	onDateSelect?: (date: Date) => void;
}

// Real-time component props (WebSocket integration)
export interface RealtimeNotificationsProps {
	userId: string;
}
