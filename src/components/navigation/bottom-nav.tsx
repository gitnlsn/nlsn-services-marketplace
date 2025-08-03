"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, Plus, Search, User } from "~/components/ui/icon";
import { cn } from "~/lib/utils";

interface NavItemProps {
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	isActive?: boolean;
	badge?: boolean;
}

function NavItem({ href, icon: Icon, label, isActive, badge }: NavItemProps) {
	return (
		<Link
			href={href}
			className={cn(
				"flex flex-col items-center justify-center space-y-1 p-2 font-medium text-xs transition-colors",
				isActive ? "text-indigo-600" : "text-gray-600 hover:text-gray-900",
			)}
		>
			<div className="relative">
				<Icon className={cn("h-6 w-6", isActive && "text-indigo-600")} />
				{badge && (
					<span className="-top-1 -right-1 absolute h-2 w-2 rounded-full bg-red-500" />
				)}
			</div>
			<span className={cn(isActive && "font-semibold")}>{label}</span>
		</Link>
	);
}

export function BottomNav() {
	const { data: session } = useSession();
	const pathname = usePathname();

	// Don't show bottom nav on auth pages
	if (pathname.startsWith("/auth") || pathname.startsWith("/login")) {
		return null;
	}

	const isActive = (path: string) => {
		if (path === "/" && pathname === "/") return true;
		if (path !== "/" && pathname.startsWith(path)) return true;
		return false;
	};

	return (
		<nav className="fixed right-0 bottom-0 left-0 z-50 border-t bg-white/90 backdrop-blur-md md:hidden">
			<div className="mx-auto grid h-16 max-w-md grid-cols-5 px-2">
				{/* Home */}
				<NavItem href="/" icon={Home} label="Home" isActive={isActive("/")} />

				{/* Search */}
				<NavItem
					href="/search"
					icon={Search}
					label="Search"
					isActive={isActive("/search")}
				/>

				{session ? (
					<>
						{/* Create/Add button - center */}
						<div className="flex items-center justify-center">
							<Link
								href="/services/create"
								className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform active:scale-95"
								aria-label="Create service"
							>
								<Plus className="h-6 w-6" />
							</Link>
						</div>

						{/* Bookings */}
						<NavItem
							href="/bookings"
							icon={Calendar}
							label="Bookings"
							isActive={isActive("/bookings")}
							badge={false} // TODO: Add actual notification logic
						/>

						{/* Profile */}
						<NavItem
							href="/dashboard"
							icon={User}
							label="Dashboard"
							isActive={isActive("/dashboard") || isActive("/profile")}
						/>
					</>
				) : (
					<>
						{/* Become Pro - center */}
						<div className="flex items-center justify-center">
							<Link
								href="/become-professional"
								className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform active:scale-95"
								aria-label="Become a professional"
							>
								<Plus className="h-6 w-6" />
							</Link>
						</div>

						{/* Sign In */}
						<NavItem
							href="/login"
							icon={User}
							label="Sign In"
							isActive={isActive("/login")}
						/>

						{/* About */}
						<NavItem
							href="/become-professional"
							icon={Calendar}
							label="For Pros"
							isActive={isActive("/become-professional")}
						/>
					</>
				)}
			</div>
		</nav>
	);
}
