"use client";

import { CalendarIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
	date?: Date;
	onDateChange: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function DatePicker({
	date,
	onDateChange,
	placeholder = "Selecionar data",
	disabled = false,
	className,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!date && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date
						? format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })
						: placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={(selectedDate) => {
						onDateChange(selectedDate);
						setOpen(false);
					}}
					disabled={(date) =>
						date < new Date() || date < new Date("1900-01-01")
					}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
