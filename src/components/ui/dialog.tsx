import * as React from "react";
import { cn } from "~/lib/utils";

const Dialog = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}
>(({ className, open = false, onOpenChange, children, ...props }, ref) => {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="fixed inset-0 bg-black/50"
				onClick={() => onOpenChange?.(false)}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						onOpenChange?.(false);
					}
				}}
				tabIndex={0}
				role="button"
				aria-label="Close dialog"
			/>
			<div
				ref={ref}
				className={cn(
					"relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</div>
	);
});
Dialog.displayName = "Dialog";

const DialogContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
	<div ref={ref} className={cn("grid gap-4", className)} {...props}>
		{children}
	</div>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			"flex flex-col space-y-1.5 text-center sm:text-left",
			className,
		)}
		{...props}
	/>
));
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h3
		ref={ref}
		className={cn(
			"font-semibold text-lg leading-none tracking-tight",
			className,
		)}
		{...props}
	/>
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className={cn("text-muted-foreground text-sm", className)}
		{...props}
	/>
));
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle };
