"use client";

import { Button } from "~/components/ui/button";
import { useToast } from "~/hooks/use-toast";
import { toast } from "~/lib/toast";

export function ToastDemo() {
	const { success, error, warning, info } = useToast();

	return (
		<div className="mt-4 flex flex-wrap gap-2">
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					success("Success!", "Your action was completed successfully.")
				}
			>
				Success Toast
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					error("Error!", "Something went wrong. Please try again.")
				}
			>
				Error Toast
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					warning("Warning!", "Please check your input before proceeding.")
				}
			>
				Warning Toast
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() => info("Info", "Here's some helpful information for you.")}
			>
				Info Toast
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					toast.success(
						"Global Toast",
						"This toast was triggered from outside a component!",
					)
				}
			>
				Global Toast
			</Button>
		</div>
	);
}
