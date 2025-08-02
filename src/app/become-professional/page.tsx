"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useAuth } from "~/contexts/auth-context";
import { api } from "~/trpc/react";

const formSchema = z.object({
	cpf: z
		.string()
		.min(11, "CPF deve ter 11 dígitos")
		.max(11, "CPF deve ter 11 dígitos")
		.regex(/^\d+$/, "CPF deve conter apenas números"),
	phone: z.string().min(10, "Telefone é obrigatório"),
	bio: z
		.string()
		.min(50, "Bio deve ter pelo menos 50 caracteres")
		.max(500, "Bio deve ter no máximo 500 caracteres"),
	address: z.string().min(5, "Endereço é obrigatório"),
	city: z.string().min(2, "Cidade é obrigatória"),
	state: z
		.string()
		.length(2, "Estado deve ter 2 letras")
		.regex(/^[A-Z]{2}$/, "Estado deve ser em maiúsculas"),
	zipCode: z
		.string()
		.length(8, "CEP deve ter 8 dígitos")
		.regex(/^\d+$/, "CEP deve conter apenas números"),
	acceptTerms: z.boolean().refine((val) => val === true, {
		message: "Você deve aceitar os termos e condições",
	}),
});

type FormData = z.infer<typeof formSchema>;

export default function BecomeProfessionalPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const returnUrl = searchParams.get("returnUrl") ?? "/dashboard";

	const { user, refreshUser } = useAuth();

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			cpf: "",
			phone: "",
			bio: "",
			address: "",
			city: "",
			state: "",
			zipCode: "",
			acceptTerms: false,
		},
	});

	const becomeProfessional = api.user.becomeProfessional.useMutation({
		onSuccess: async () => {
			await refreshUser();
			router.push(returnUrl);
		},
	});

	const onSubmit = (values: FormData) => {
		becomeProfessional.mutate();
	};

	if (!user) {
		router.push("/login");
		return null;
	}

	return (
		<div className="container mx-auto max-w-2xl px-4 py-8">
			<h1 className="font-bold text-3xl">Become a Professional</h1>
			<p className="mt-4 text-muted-foreground">
				Upgrade your account to start offering services on our marketplace.
			</p>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
					<FormField
						control={form.control}
						name="cpf"
						render={({ field }) => (
							<FormItem>
								<FormLabel>CPF (11 dígitos)</FormLabel>
								<FormControl>
									<Input
										placeholder="12345678901"
										maxLength={11}
										{...field}
										onChange={(e) =>
											field.onChange(e.target.value.replace(/\D/g, ""))
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="phone"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Telefone</FormLabel>
								<FormControl>
									<Input
										type="tel"
										placeholder="+55 11 99999-9999"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="bio"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Bio Profissional</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Descreva seus serviços e experiência em detalhes..."
										rows={4}
										{...field}
									/>
								</FormControl>
								<FormDescription>
									{field.value.length}/500 caracteres (mínimo 50)
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="address"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Endereço</FormLabel>
								<FormControl>
									<Input placeholder="Endereço completo" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="city"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Cidade</FormLabel>
									<FormControl>
										<Input placeholder="Cidade" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="state"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Estado</FormLabel>
									<FormControl>
										<Input
											placeholder="SP"
											maxLength={2}
											{...field}
											onChange={(e) =>
												field.onChange(e.target.value.toUpperCase())
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="zipCode"
						render={({ field }) => (
							<FormItem>
								<FormLabel>CEP (8 dígitos)</FormLabel>
								<FormControl>
									<Input
										placeholder="01234567"
										maxLength={8}
										{...field}
										onChange={(e) =>
											field.onChange(e.target.value.replace(/\D/g, ""))
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="acceptTerms"
						render={({ field }) => (
							<FormItem className="flex flex-row items-start space-x-3 space-y-0">
								<FormControl>
									<Checkbox
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel>Aceito os termos e condições</FormLabel>
									<FormDescription>
										Você deve aceitar os{" "}
										<a
											href="/terms"
											className="text-primary underline hover:no-underline"
										>
											termos e condições
										</a>
									</FormDescription>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex gap-4">
						<Button
							type="submit"
							disabled={becomeProfessional.isPending}
							className="flex-1"
						>
							{becomeProfessional.isPending
								? "Criando conta profissional..."
								: "Tornar-se Profissional"}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
						>
							Cancelar
						</Button>
					</div>

					{becomeProfessional.error && (
						<p className="text-destructive text-sm">
							{becomeProfessional.error.message}
						</p>
					)}
				</form>
			</Form>
		</div>
	);
}
