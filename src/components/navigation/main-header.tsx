"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Bell,
	Calendar,
	Home,
	Menu,
	Plus,
	Search,
	Service,
	Settings,
	User,
	X,
} from "~/components/ui/icon";
import { cn } from "~/lib/utils";

export function MainHeader() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const { data: session } = useSession();
	const pathname = usePathname();

	const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

	return (
		<>
			{/* Header */}
			<header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					{/* Logo */}
					<Link href="/" className="flex items-center space-x-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
							<span className="font-bold text-sm text-white">NS</span>
						</div>
						<span className="hidden font-bold text-gray-900 text-xl sm:inline">
							Services
						</span>
					</Link>

					{/* Desktop Navigation */}
					<nav className="hidden items-center space-x-6 md:flex">
						<Link
							href="/search"
							className={cn(
								"font-medium text-gray-600 text-sm transition-colors hover:text-gray-900",
								pathname === "/search" && "text-indigo-600",
							)}
						>
							Find Services
						</Link>
						{session ? (
							<>
								<Link
									href="/dashboard"
									className={cn(
										"font-medium text-gray-600 text-sm transition-colors hover:text-gray-900",
										pathname === "/dashboard" && "text-indigo-600",
									)}
								>
									Dashboard
								</Link>
								<Link
									href="/bookings"
									className={cn(
										"font-medium text-gray-600 text-sm transition-colors hover:text-gray-900",
										pathname === "/bookings" && "text-indigo-600",
									)}
								>
									Bookings
								</Link>
							</>
						) : (
							<Link
								href="/become-professional"
								className="font-medium text-gray-600 text-sm transition-colors hover:text-gray-900"
							>
								Become a Pro
							</Link>
						)}
					</nav>

					{/* Desktop Right Actions */}
					<div className="hidden items-center space-x-2 md:flex">
						{session ? (
							<>
								<Button variant="ghost" size="icon" className="relative">
									<Bell className="h-5 w-5" />
									{/* Notification dot */}
									<span className="-top-1 -right-1 absolute h-3 w-3 rounded-full bg-red-500" />
								</Button>
								<Link href="/profile">
									<Button variant="ghost" size="icon">
										<User className="h-5 w-5" />
									</Button>
								</Link>
								<Link href="/settings">
									<Button variant="ghost" size="icon">
										<Settings className="h-5 w-5" />
									</Button>
								</Link>
							</>
						) : (
							<>
								<Link href="/login">
									<Button variant="outline" size="sm">
										Sign In
									</Button>
								</Link>
								<Link href="/login">
									<Button size="sm">Get Started</Button>
								</Link>
							</>
						)}
					</div>

					{/* Mobile Menu Button */}
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={toggleMobileMenu}
						aria-label="Toggle mobile menu"
					>
						{isMobileMenuOpen ? (
							<X className="h-6 w-6" />
						) : (
							<Menu className="h-6 w-6" />
						)}
					</Button>
				</div>

				{/* Mobile Menu */}
				{isMobileMenuOpen && (
					<div className="border-t bg-white md:hidden">
						<nav className="container mx-auto px-4 py-4">
							<div className="space-y-4">
								{/* Search */}
								<Link
									href="/search"
									className="flex items-center space-x-3 rounded-lg p-3 text-gray-700 hover:bg-gray-50"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									<Search className="h-5 w-5" />
									<span className="font-medium">Find Services</span>
								</Link>

								{session ? (
									<>
										{/* Dashboard */}
										<Link
											href="/dashboard"
											className="flex items-center space-x-3 rounded-lg p-3 text-gray-700 hover:bg-gray-50"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<Home className="h-5 w-5" />
											<span className="font-medium">Dashboard</span>
										</Link>

										{/* Bookings */}
										<Link
											href="/bookings"
											className="flex items-center space-x-3 rounded-lg p-3 text-gray-700 hover:bg-gray-50"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<Calendar className="h-5 w-5" />
											<span className="font-medium">My Bookings</span>
										</Link>

										{/* Services */}
										<Link
											href="/dashboard/services"
											className="flex items-center space-x-3 rounded-lg p-3 text-gray-700 hover:bg-gray-50"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<Service className="h-5 w-5" />
											<span className="font-medium">My Services</span>
										</Link>

										{/* Profile */}
										<Link
											href="/profile"
											className="flex items-center space-x-3 rounded-lg p-3 text-gray-700 hover:bg-gray-50"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<User className="h-5 w-5" />
											<span className="font-medium">Profile</span>
										</Link>

										{/* Settings */}
										<Link
											href="/settings"
											className="flex items-center space-x-3 rounded-lg p-3 text-gray-700 hover:bg-gray-50"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<Settings className="h-5 w-5" />
											<span className="font-medium">Settings</span>
										</Link>

										<div className="border-t pt-4">
											<Link href="/auth/signout">
												<Button variant="outline" className="w-full">
													Sign Out
												</Button>
											</Link>
										</div>
									</>
								) : (
									<>
										{/* Become Professional */}
										<Link
											href="/become-professional"
											className="flex items-center space-x-3 rounded-lg p-3 text-gray-700 hover:bg-gray-50"
											onClick={() => setIsMobileMenuOpen(false)}
										>
											<Plus className="h-5 w-5" />
											<span className="font-medium">Become a Professional</span>
										</Link>

										<div className="space-y-3 border-t pt-4">
											<Link href="/login">
												<Button variant="outline" className="w-full" size="lg">
													Sign In
												</Button>
											</Link>
											<Link href="/login">
												<Button className="w-full" size="lg">
													Get Started
												</Button>
											</Link>
										</div>
									</>
								)}
							</div>
						</nav>
					</div>
				)}
			</header>

			{/* Backdrop for mobile menu */}
			{isMobileMenuOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/20 md:hidden"
					onClick={() => setIsMobileMenuOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setIsMobileMenuOpen(false);
						}
					}}
					role="button"
					tabIndex={0}
					aria-label="Close mobile menu"
				/>
			)}
		</>
	);
}
