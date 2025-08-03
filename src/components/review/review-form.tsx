"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Star } from "~/components/ui/icon";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

interface ReviewFormProps {
	serviceId: string;
	bookingId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function ReviewForm({
	serviceId,
	bookingId,
	onSuccess,
	onCancel,
}: ReviewFormProps) {
	const [rating, setRating] = useState(0);
	const [hoveredRating, setHoveredRating] = useState(0);
	const [comment, setComment] = useState("");

	const utils = api.useUtils();

	const createReview = api.review.create.useMutation({
		onSuccess: () => {
			utils.review.getByService.invalidate({ serviceId });
			utils.review.getServiceStats.invalidate({ serviceId });
			onSuccess?.();
		},
		onError: (error) => {
			alert(`Erro ao enviar avaliação: ${error.message}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (rating === 0) {
			alert("Por favor, selecione uma avaliação");
			return;
		}

		createReview.mutate({
			serviceId,
			bookingId,
			rating,
			comment: comment.trim() || undefined,
		});
	};

	const getRatingLabel = (value: number) => {
		const labels = {
			1: "Péssimo",
			2: "Ruim",
			3: "Regular",
			4: "Bom",
			5: "Excelente",
		};
		return labels[value as keyof typeof labels] || "";
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Avaliar Serviço</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Rating */}
					<div>
						<div className="mb-2 font-medium text-gray-700 text-sm">
							Como foi sua experiência?
						</div>
						<div className="flex items-center gap-2">
							{[1, 2, 3, 4, 5].map((value) => (
								<button
									key={`star-${value}`}
									type="button"
									onClick={() => setRating(value)}
									onMouseEnter={() => setHoveredRating(value)}
									onMouseLeave={() => setHoveredRating(0)}
									className="p-1 transition-transform hover:scale-110"
								>
									{value <= (hoveredRating || rating) ? (
										<Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
									) : (
										<Star className="h-8 w-8 text-gray-300" />
									)}
								</button>
							))}
							{(hoveredRating || rating) > 0 && (
								<span className="ml-2 text-gray-600 text-sm">
									{getRatingLabel(hoveredRating || rating)}
								</span>
							)}
						</div>
					</div>

					{/* Comment */}
					<div>
						<label
							htmlFor="comment"
							className="mb-2 block font-medium text-gray-700 text-sm"
						>
							Comentário (opcional)
						</label>
						<Textarea
							id="comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder="Conte mais sobre sua experiência..."
							rows={4}
							maxLength={1000}
						/>
						<p className="mt-1 text-gray-500 text-xs">
							{comment.length}/1000 caracteres
						</p>
					</div>

					{/* Actions */}
					<div className="flex gap-3">
						{onCancel && (
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={createReview.isPending}
							>
								Cancelar
							</Button>
						)}
						<Button
							type="submit"
							disabled={createReview.isPending || rating === 0}
							className="flex-1"
						>
							{createReview.isPending ? "Enviando..." : "Enviar Avaliação"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
