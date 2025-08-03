import type { LucideIcon, LucideProps } from "lucide-react";
import {
	AlertCircle,
	AlertTriangle,
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Award,
	Bell,
	BellOff,
	// Business & Services
	Briefcase,
	Building,
	Calendar,
	Camera,
	Check,
	// Status & Feedback
	CheckCircle,
	ChevronDown,
	// Navigation & Actions
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock,
	Copy,
	CreditCard,
	DollarSign,
	Download,
	Edit,
	ExternalLink,
	Eye,
	EyeOff,
	Facebook,
	FileText,
	Filter,
	Github,
	Globe,
	// Layout & Display
	Grid3X3,
	// Social & Communication
	Heart,
	HelpCircle,
	Home,
	Image,
	Info,
	Instagram,
	Link,
	Linkedin,
	List,
	Loader2,
	Lock,
	Mail,
	MapPin,
	Menu,
	MessageCircle,
	Minus,
	MoreHorizontal,
	MoreVertical,
	Package,
	Paperclip,
	Phone,
	Plus,
	Power,
	RefreshCw,
	RotateCcw,
	Save,
	Search,
	Send,
	Settings,
	Share,
	Shield,
	ShoppingCart,
	SortAsc,
	Star,
	Trash2,
	Truck,
	Twitter,
	Unlock,
	// File & Media
	Upload,
	User,
	UserCheck,
	UserMinus,
	UserPlus,
	Users,
	Video,
	Wifi,
	WifiOff,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { cn } from "~/lib/utils";

// Common icon props interface
interface IconProps extends Omit<LucideProps, "ref"> {
	className?: string;
}

// Icon wrapper component for consistent styling
export function Icon({
	className,
	...props
}: IconProps & { icon: LucideIcon }) {
	const IconComponent = props.icon;

	return <IconComponent className={cn("h-4 w-4", className)} {...props} />;
}

// Re-export commonly used icons with semantic names
export {
	// Navigation & Actions
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	ArrowLeft,
	ArrowRight,
	ArrowDown,
	ArrowUp,
	Plus,
	Minus,
	X,
	Check,
	Save,
	Edit,
	Trash2 as Delete,
	MoreVertical as More,
	MoreHorizontal as MoreMenu,
	// UI Elements
	Search,
	Filter,
	SortAsc as Sort,
	Eye,
	EyeOff,
	Settings,
	Menu,
	Grid3X3 as Grid,
	List,
	Calendar,
	Clock,
	Bell,
	BellOff,
	// User & Profile
	User,
	Users,
	UserPlus,
	UserMinus,
	UserCheck,
	Heart,
	Star,
	Shield,
	Award,
	// Communication
	Mail,
	Phone,
	MessageCircle as Message,
	Send,
	Share,
	Link,
	Copy,
	// Business & Commerce
	CreditCard,
	DollarSign as Money,
	ShoppingCart as Cart,
	Package,
	Truck as Delivery,
	MapPin,
	MapPin as Location,
	Home,
	Building,
	// Status & Feedback
	CheckCircle as Success,
	XCircle as Error,
	AlertCircle as Warning,
	Info,
	HelpCircle as Help,
	Loader2 as Loading,
	// File & Media
	Upload,
	Download,
	FileText as File,
	Image,
	Camera,
	Video,
	Paperclip as Attachment,
	// System
	Wifi,
	WifiOff,
	Zap as Lightning,
	Power,
	RefreshCw as Refresh,
	RotateCcw as Sync,
	Lock,
	Unlock,
	// Social & External
	ExternalLink,
	Globe,
	Github,
	Twitter,
	Facebook,
	Instagram,
	Linkedin,
	// Specific to our app
	Briefcase as Service,
	Calendar as Booking,
	Star as Rating,
	MapPin as Address,
	Clock as Duration,
	DollarSign as Price,
	Users as Team,
	MessageCircle as Chat,
	Bell as Notification,
	Settings as Config,
} from "lucide-react";

// Icon size presets
export const iconSizes = {
	xs: "h-3 w-3",
	sm: "h-4 w-4",
	md: "h-5 w-5",
	lg: "h-6 w-6",
	xl: "h-8 w-8",
	"2xl": "h-10 w-10",
} as const;

export type IconSize = keyof typeof iconSizes;

// Semantic icon component with size support
export function SemanticIcon({
	icon: IconComponent,
	size = "sm",
	className,
	...props
}: IconProps & {
	icon: LucideIcon;
	size?: IconSize;
}) {
	return (
		<IconComponent className={cn(iconSizes[size], className)} {...props} />
	);
}

// Common icon combinations for our app
export const AppIcons = {
	// Navigation
	back: ArrowLeft,
	forward: ArrowRight,
	close: X,
	menu: Menu,

	// Actions
	add: Plus,
	remove: Minus,
	edit: Edit,
	delete: Trash2,
	save: Save,
	search: Search,
	filter: Filter,
	sort: SortAsc,

	// User actions
	like: Heart,
	rate: Star,
	share: Share,
	message: MessageCircle,
	call: Phone,
	email: Mail,

	// Status
	success: CheckCircle,
	error: XCircle,
	warning: AlertCircle,
	info: Info,
	loading: Loader2,

	// Business
	service: Briefcase,
	booking: Calendar,
	payment: CreditCard,
	location: MapPin,
	price: DollarSign,
	time: Clock,

	// File operations
	upload: Upload,
	download: Download,
	attach: Paperclip,

	// View modes
	grid: Grid3X3,
	list: List,
	map: MapPin,
	calendar: Calendar,
} as const;
