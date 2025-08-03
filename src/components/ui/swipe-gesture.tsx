"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

interface SwipeHandlers {
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	onSwipeUp?: () => void;
	onSwipeDown?: () => void;
}

interface SwipeGestureProps {
	children: React.ReactNode;
	className?: string;
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	onSwipeUp?: () => void;
	onSwipeDown?: () => void;
	threshold?: number; // Minimum distance for swipe detection
	velocity?: number; // Minimum velocity for swipe detection
	disabled?: boolean;
}

/**
 * SwipeGesture component enables touch swipe interactions
 * Supports all four directions with configurable thresholds
 */
export function SwipeGesture({
	children,
	className,
	onSwipeLeft,
	onSwipeRight,
	onSwipeUp,
	onSwipeDown,
	threshold = 50,
	velocity = 0.3,
	disabled = false,
}: SwipeGestureProps) {
	const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
		null,
	);
	const [isTracking, setIsTracking] = useState(false);

	const handleTouchStart = (e: React.TouchEvent) => {
		if (disabled) return;

		const touch = e.touches[0];
		if (touch) {
			touchStartRef.current = {
				x: touch.clientX,
				y: touch.clientY,
				time: Date.now(),
			};
			setIsTracking(true);
		}
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (disabled || !touchStartRef.current || !isTracking) return;

		const touch = e.changedTouches[0];
		if (!touch) return;

		const deltaX = touch.clientX - touchStartRef.current.x;
		const deltaY = touch.clientY - touchStartRef.current.y;
		const deltaTime = Date.now() - touchStartRef.current.time;

		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
		const swipeVelocity = distance / deltaTime;

		// Check if swipe meets minimum criteria
		if (distance < threshold || swipeVelocity < velocity) {
			setIsTracking(false);
			return;
		}

		// Determine swipe direction
		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			// Horizontal swipe
			if (deltaX > 0 && onSwipeRight) {
				onSwipeRight();
			} else if (deltaX < 0 && onSwipeLeft) {
				onSwipeLeft();
			}
		} else {
			// Vertical swipe
			if (deltaY > 0 && onSwipeDown) {
				onSwipeDown();
			} else if (deltaY < 0 && onSwipeUp) {
				onSwipeUp();
			}
		}

		setIsTracking(false);
		touchStartRef.current = null;
	};

	const handleTouchCancel = () => {
		setIsTracking(false);
		touchStartRef.current = null;
	};

	return (
		<div
			className={cn("touch-pan-y", className)}
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
			onTouchCancel={handleTouchCancel}
		>
			{children}
		</div>
	);
}

/**
 * Swipeable card component with visual feedback
 */
interface SwipeableCardProps {
	children: React.ReactNode;
	className?: string;
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	leftAction?: {
		icon: React.ReactNode;
		color: string;
		label: string;
	};
	rightAction?: {
		icon: React.ReactNode;
		color: string;
		label: string;
	};
}

export function SwipeableCard({
	children,
	className,
	onSwipeLeft,
	onSwipeRight,
	leftAction,
	rightAction,
}: SwipeableCardProps) {
	const [swipeOffset, setSwipeOffset] = useState(0);
	const [isAnimating, setIsAnimating] = useState(false);
	const cardRef = useRef<HTMLDivElement>(null);

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!cardRef.current) return;

		const touch = e.touches[0];
		if (!touch) return;

		const startX = cardRef.current.getBoundingClientRect().left;
		const currentX = touch.clientX;
		const offset = currentX - startX;

		// Limit swipe distance
		const maxOffset = 100;
		const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset));
		setSwipeOffset(clampedOffset);
	};

	const resetCard = () => {
		setIsAnimating(true);
		setSwipeOffset(0);
		setTimeout(() => setIsAnimating(false), 200);
	};

	const executeAction = (action: () => void) => {
		setIsAnimating(true);
		setTimeout(() => {
			action();
			setSwipeOffset(0);
			setIsAnimating(false);
		}, 200);
	};

	return (
		<div className="relative overflow-hidden">
			{/* Background actions */}
			{leftAction && (
				<div
					className={cn(
						"absolute inset-y-0 left-0 flex items-center justify-start pl-4",
						"w-24 transition-opacity",
						leftAction.color,
						swipeOffset > 20 ? "opacity-100" : "opacity-0",
					)}
				>
					<div className="flex flex-col items-center text-white">
						{leftAction.icon}
						<span className="font-medium text-xs">{leftAction.label}</span>
					</div>
				</div>
			)}

			{rightAction && (
				<div
					className={cn(
						"absolute inset-y-0 right-0 flex items-center justify-end pr-4",
						"w-24 transition-opacity",
						rightAction.color,
						swipeOffset < -20 ? "opacity-100" : "opacity-0",
					)}
				>
					<div className="flex flex-col items-center text-white">
						{rightAction.icon}
						<span className="font-medium text-xs">{rightAction.label}</span>
					</div>
				</div>
			)}

			{/* Card content */}
			<SwipeGesture
				onSwipeLeft={() => onSwipeLeft && executeAction(onSwipeLeft)}
				onSwipeRight={() => onSwipeRight && executeAction(onSwipeRight)}
				threshold={60}
			>
				<div
					ref={cardRef}
					className={cn(
						"relative bg-white transition-transform",
						isAnimating && "duration-200",
						className,
					)}
					style={{
						transform: `translateX(${swipeOffset}px)`,
					}}
					onTouchMove={handleTouchMove}
					onTouchEnd={resetCard}
				>
					{children}
				</div>
			</SwipeGesture>
		</div>
	);
}

/**
 * Pull-to-refresh component for mobile lists
 */
interface PullToRefreshProps {
	children: React.ReactNode;
	onRefresh: () => Promise<void>;
	className?: string;
	threshold?: number;
	disabled?: boolean;
}

export function PullToRefresh({
	children,
	onRefresh,
	className,
	threshold = 80,
	disabled = false,
}: PullToRefreshProps) {
	const [pullDistance, setPullDistance] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [startY, setStartY] = useState(0);

	const handleTouchStart = (e: React.TouchEvent) => {
		if (disabled || window.scrollY > 0) return;
		const firstTouch = e.touches[0];
		if (firstTouch) {
			setStartY(firstTouch.clientY);
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (disabled || window.scrollY > 0 || isRefreshing) return;

		const firstTouch = e.touches[0];
		if (firstTouch) {
			const currentY = firstTouch.clientY;
			const distance = Math.max(0, currentY - startY);
			const dampedDistance = distance * 0.5; // Damping factor

			setPullDistance(Math.min(dampedDistance, threshold * 1.5));
		}
	};

	const handleTouchEnd = async () => {
		if (disabled || isRefreshing) return;

		if (pullDistance >= threshold) {
			setIsRefreshing(true);
			try {
				await onRefresh();
			} finally {
				setIsRefreshing(false);
			}
		}

		setPullDistance(0);
	};

	const refreshProgress = Math.min(pullDistance / threshold, 1);

	return (
		<div
			className={cn("relative", className)}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
		>
			{/* Pull indicator */}
			{(pullDistance > 0 || isRefreshing) && (
				<div
					className="absolute top-0 right-0 left-0 flex items-center justify-center bg-gray-50 transition-all"
					style={{
						height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
						transform: `translateY(-${isRefreshing ? 0 : Math.max(0, 60 - pullDistance)}px)`,
					}}
				>
					<div className="flex flex-col items-center space-y-2">
						<div
							className={cn(
								"h-6 w-6 rounded-full border-2 border-gray-300",
								isRefreshing && "animate-spin border-t-indigo-600",
							)}
							style={{
								transform: `rotate(${refreshProgress * 360}deg)`,
							}}
						/>
						<span className="text-gray-600 text-sm">
							{isRefreshing
								? "Refreshing..."
								: pullDistance >= threshold
									? "Release to refresh"
									: "Pull to refresh"}
						</span>
					</div>
				</div>
			)}

			{/* Content */}
			<div
				style={{
					transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
				}}
				className="transition-transform"
			>
				{children}
			</div>
		</div>
	);
}
