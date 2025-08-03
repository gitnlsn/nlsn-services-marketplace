// Lazy-loaded components for code splitting
import {
	withComponentLoading,
	withModalLoading,
	withPageLoading,
} from "~/components/ui/lazy-wrapper";

// Heavy components that can be lazy loaded
export const LazyBookingModal = withModalLoading(
	() =>
		import("~/components/booking/booking-modal").then((m) => ({
			default: m.BookingModal,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyReviewModal = withModalLoading(
	() =>
		import("~/components/review/review-modal").then((m) => ({
			default: m.ReviewModal,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyMessagingInterface = withComponentLoading(
	() =>
		import("~/components/messaging/messaging-interface").then((m) => ({
			default: m.MessagingInterface,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyMapView = withComponentLoading(
	() =>
		import("~/components/map/map-view").then((m) => ({
			default: m.MapView,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyServiceForm = withComponentLoading(
	() =>
		import("~/components/services/service-form").then((m) => ({
			default: m.ServiceForm,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyProfileEditForm = withComponentLoading(
	() =>
		import("~/components/profile/profile-edit-form").then((m) => ({
			default: m.ProfileEditForm,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyAvailabilityCalendar = withComponentLoading(
	() =>
		import("~/components/availability/availability-calendar").then((m) => ({
			default: m.AvailabilityCalendar,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyGoogleCalendarIntegration = withComponentLoading(
	() =>
		import("~/components/availability/google-calendar-integration").then(
			(m) => ({ default: m.GoogleCalendarIntegration }),
		) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyServiceGallery = withComponentLoading(
	() =>
		import("~/components/services/service-gallery").then((m) => ({
			default: m.ServiceGallery,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyWaitlistManagement = withComponentLoading(
	() =>
		import("~/components/waitlist/waitlist-management").then((m) => ({
			default: m.WaitlistManagement,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyPWAInstaller = withComponentLoading(
	() =>
		import("~/components/pwa/pwa-installer").then((m) => ({
			default: m.PWAInstaller,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyGoogleDrivePicker = withComponentLoading(
	() =>
		import("~/components/ui/google-drive-picker").then((m) => ({
			default: m.GoogleDrivePicker,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

// Dashboard components (only loaded when needed)
export const LazyProfessionalDashboard = withPageLoading(
	() =>
		import("~/components/dashboard/professional-dashboard").then((m) => ({
			default: m.ProfessionalDashboard,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyCustomerDashboard = withPageLoading(
	() =>
		import("~/components/dashboard/customer-dashboard").then((m) => ({
			default: m.CustomerDashboard,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

// Settings components
export const LazyCommunicationSettings = withComponentLoading(
	() =>
		import("~/components/settings/communication-settings").then((m) => ({
			default: m.CommunicationSettings,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyNotificationPreferences = withComponentLoading(
	() =>
		import("~/components/settings/notification-preferences").then((m) => ({
			default: m.NotificationPreferences,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

export const LazyAvailabilitySettings = withComponentLoading(
	() =>
		import("~/components/availability/availability-settings").then((m) => ({
			default: m.AvailabilitySettings,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

// Service management (admin/professional only)
export const LazyServiceManagement = withComponentLoading(
	() =>
		import("~/components/services/service-management").then((m) => ({
			default: m.ServiceManagement,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

// Real-time features (loaded on demand)
export const LazyRealtimeNotifications = withComponentLoading(
	() =>
		import("~/components/notifications/realtime-notifications").then((m) => ({
			default: m.RealtimeNotifications,
		})) as Promise<{ default: React.ComponentType<object> }>,
);

// Toast demo (development only)
export const LazyToastDemo = withComponentLoading(
	() =>
		import("~/components/ui/toast-demo").then((m) => ({
			default: m.ToastDemo,
		})) as Promise<{ default: React.ComponentType<object> }>,
);
