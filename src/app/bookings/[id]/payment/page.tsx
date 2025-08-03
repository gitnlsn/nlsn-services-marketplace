"use client";

import {
	CreditCardIcon,
	DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Loading } from "~/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

export default function PaymentPage() {
	const params = useParams();
	const router = useRouter();
	const bookingId = params.id as string;

	const [paymentMethod, setPaymentMethod] = useState<
		"credit_card" | "pix" | "boleto"
	>("credit_card");
	const [isProcessing, setIsProcessing] = useState(false);

	// Credit card form state
	const [cardNumber, setCardNumber] = useState("");
	const [cardHolder, setCardHolder] = useState("");
	const [expiryMonth, setExpiryMonth] = useState("");
	const [expiryYear, setExpiryYear] = useState("");
	const [cvv, setCvv] = useState("");
	const [installments, setInstallments] = useState(1);

	// Boleto form state
	const [cpf, setCpf] = useState("");
	const [fullName, setFullName] = useState("");

	// Billing address state
	const [street, setStreet] = useState("");
	const [number, setNumber] = useState("");
	const [complement, setComplement] = useState("");
	const [neighborhood, setNeighborhood] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("");
	const [zipCode, setZipCode] = useState("");

	const { data: booking, isLoading } = api.booking.getById.useQuery({
		bookingId,
	});

	const processPayment = api.payment.processPayment.useMutation({
		onSuccess: (data) => {
			if (data.paymentResult.status === "paid") {
				alert("Pagamento realizado com sucesso!");
				router.push(`/bookings/${bookingId}`);
			} else if (paymentMethod === "pix") {
				// Show PIX QR code
				showPixModal(data.paymentResult);
			} else if (paymentMethod === "boleto") {
				// Open boleto URL
				if (data.paymentResult.boletoUrl) {
					window.open(data.paymentResult.boletoUrl, "_blank");
				}
				alert("Boleto gerado! Uma nova aba foi aberta com o boleto.");
				router.push(`/bookings/${bookingId}`);
			}
		},
		onError: (error) => {
			alert(`Erro ao processar pagamento: ${error.message}`);
			setIsProcessing(false);
		},
	});

	const showPixModal = (paymentResult: {
		pixCode?: string;
		qrCode?: string;
	}) => {
		// In a real implementation, this would show a modal with the QR code
		alert(
			`PIX gerado!\n\nCódigo PIX: ${paymentResult.pixCode || ""}\n\nCopie o código ou escaneie o QR code para realizar o pagamento.`,
		);
		router.push(`/bookings/${bookingId}`);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsProcessing(true);

		const billingAddress = {
			street,
			number,
			complement: complement || undefined,
			neighborhood,
			city,
			state,
			zipCode: zipCode.replace(/\D/g, ""),
		};

		let paymentMethodData:
			| {
					type: "credit_card";
					cardNumber: string;
					cardHolderName: string;
					expiryMonth: string;
					expiryYear: string;
					cvv: string;
					installments: number;
			  }
			| { type: "pix" }
			| { type: "boleto"; cpf: string; fullName: string };

		switch (paymentMethod) {
			case "credit_card":
				paymentMethodData = {
					type: "credit_card" as const,
					cardNumber: cardNumber.replace(/\s/g, ""),
					cardHolderName: cardHolder,
					expiryMonth,
					expiryYear,
					cvv,
					installments,
				};
				break;
			case "pix":
				paymentMethodData = {
					type: "pix" as const,
				};
				break;
			case "boleto":
				paymentMethodData = {
					type: "boleto" as const,
					cpf: cpf.replace(/\D/g, ""),
					fullName,
				};
				break;
		}

		processPayment.mutate({
			bookingId,
			paymentMethod: paymentMethodData,
			billingAddress,
		});
	};

	const formatCardNumber = (value: string) => {
		const cleaned = value.replace(/\D/g, "");
		const groups = cleaned.match(/.{1,4}/g) || [];
		return groups.join(" ");
	};

	const formatCPF = (value: string) => {
		const cleaned = value.replace(/\D/g, "");
		if (cleaned.length <= 11) {
			return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
		}
		return value;
	};

	if (isLoading) {
		return (
			<Loading
				className="min-h-screen"
				size="lg"
				text="Carregando informações..."
			/>
		);
	}

	if (!booking) {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4 text-center">
					<h1 className="mb-4 font-bold text-2xl text-gray-900">
						Agendamento não encontrado
					</h1>
					<Button onClick={() => router.push("/bookings")}>
						Voltar aos agendamentos
					</Button>
				</div>
			</div>
		);
	}

	if (booking.payment?.status === "paid") {
		return (
			<div className="min-h-screen bg-gray-50 py-8">
				<div className="container mx-auto px-4 text-center">
					<h1 className="mb-4 font-bold text-2xl text-gray-900">
						Este agendamento já foi pago
					</h1>
					<Button onClick={() => router.push(`/bookings/${bookingId}`)}>
						Ver detalhes do agendamento
					</Button>
				</div>
			</div>
		);
	}

	const calculateInstallmentValue = (installmentCount: number) => {
		return (booking.totalPrice / installmentCount).toFixed(2);
	};

	return (
		<main className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto max-w-4xl px-4">
				<div className="mb-6">
					<Button
						variant="outline"
						onClick={() => router.push(`/bookings/${bookingId}`)}
					>
						← Voltar ao agendamento
					</Button>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Payment Form */}
					<div className="lg:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle>Pagamento do Agendamento</CardTitle>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmit} className="space-y-6">
									{/* Payment Method Tabs */}
									<Tabs
										value={paymentMethod}
										onValueChange={(v) =>
											setPaymentMethod(v as "credit_card" | "pix" | "boleto")
										}
									>
										<TabsList className="grid w-full grid-cols-3">
											<TabsTrigger value="credit_card">Cartão</TabsTrigger>
											<TabsTrigger value="pix">PIX</TabsTrigger>
											<TabsTrigger value="boleto">Boleto</TabsTrigger>
										</TabsList>

										{/* Credit Card */}
										<TabsContent value="credit_card" className="space-y-4">
											<div>
												<Label htmlFor="cardNumber">Número do Cartão</Label>
												<Input
													id="cardNumber"
													value={cardNumber}
													onChange={(e) =>
														setCardNumber(formatCardNumber(e.target.value))
													}
													placeholder="1234 5678 9012 3456"
													maxLength={19}
													required
												/>
											</div>

											<div>
												<Label htmlFor="cardHolder">Nome no Cartão</Label>
												<Input
													id="cardHolder"
													value={cardHolder}
													onChange={(e) => setCardHolder(e.target.value)}
													placeholder="JOÃO DA SILVA"
													required
												/>
											</div>

											<div className="grid grid-cols-3 gap-4">
												<div>
													<Label htmlFor="expiryMonth">Mês</Label>
													<Input
														id="expiryMonth"
														value={expiryMonth}
														onChange={(e) => setExpiryMonth(e.target.value)}
														placeholder="MM"
														maxLength={2}
														required
													/>
												</div>
												<div>
													<Label htmlFor="expiryYear">Ano</Label>
													<Input
														id="expiryYear"
														value={expiryYear}
														onChange={(e) => setExpiryYear(e.target.value)}
														placeholder="AA"
														maxLength={2}
														required
													/>
												</div>
												<div>
													<Label htmlFor="cvv">CVV</Label>
													<Input
														id="cvv"
														value={cvv}
														onChange={(e) => setCvv(e.target.value)}
														placeholder="123"
														maxLength={4}
														required
													/>
												</div>
											</div>

											<div>
												<Label htmlFor="installments">Parcelas</Label>
												<select
													id="installments"
													value={installments}
													onChange={(e) =>
														setInstallments(Number(e.target.value))
													}
													className="w-full rounded-lg border border-gray-300 px-3 py-2"
												>
													{[1, 2, 3, 4, 5, 6, 12].map((count) => (
														<option key={count} value={count}>
															{count}x de R$ {calculateInstallmentValue(count)}
														</option>
													))}
												</select>
											</div>
										</TabsContent>

										{/* PIX */}
										<TabsContent value="pix" className="space-y-4">
											<div className="py-8 text-center">
												<CreditCardIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
												<p className="text-gray-600">
													Após confirmar, você receberá um código PIX para
													pagamento
												</p>
												<p className="mt-2 text-gray-500 text-sm">
													O código expira em 1 hora
												</p>
											</div>
										</TabsContent>

										{/* Boleto */}
										<TabsContent value="boleto" className="space-y-4">
											<div>
												<Label htmlFor="fullName">Nome Completo</Label>
												<Input
													id="fullName"
													value={fullName}
													onChange={(e) => setFullName(e.target.value)}
													placeholder="João da Silva"
													required
												/>
											</div>

											<div>
												<Label htmlFor="cpf">CPF</Label>
												<Input
													id="cpf"
													value={cpf}
													onChange={(e) => setCpf(formatCPF(e.target.value))}
													placeholder="000.000.000-00"
													maxLength={14}
													required
												/>
											</div>

											<div className="rounded-lg bg-yellow-50 p-4">
												<p className="text-sm text-yellow-800">
													O boleto tem vencimento em 3 dias úteis
												</p>
											</div>
										</TabsContent>
									</Tabs>

									{/* Billing Address */}
									<div className="space-y-4 border-t pt-6">
										<h3 className="font-semibold">Endereço de Cobrança</h3>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label htmlFor="street">Rua</Label>
												<Input
													id="street"
													value={street}
													onChange={(e) => setStreet(e.target.value)}
													required
												/>
											</div>
											<div>
												<Label htmlFor="number">Número</Label>
												<Input
													id="number"
													value={number}
													onChange={(e) => setNumber(e.target.value)}
													required
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="complement">Complemento (opcional)</Label>
											<Input
												id="complement"
												value={complement}
												onChange={(e) => setComplement(e.target.value)}
											/>
										</div>

										<div>
											<Label htmlFor="neighborhood">Bairro</Label>
											<Input
												id="neighborhood"
												value={neighborhood}
												onChange={(e) => setNeighborhood(e.target.value)}
												required
											/>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<Label htmlFor="city">Cidade</Label>
												<Input
													id="city"
													value={city}
													onChange={(e) => setCity(e.target.value)}
													required
												/>
											</div>
											<div>
												<Label htmlFor="state">Estado</Label>
												<Input
													id="state"
													value={state}
													onChange={(e) => setState(e.target.value)}
													maxLength={2}
													placeholder="SP"
													required
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="zipCode">CEP</Label>
											<Input
												id="zipCode"
												value={zipCode}
												onChange={(e) => setZipCode(e.target.value)}
												placeholder="00000-000"
												required
											/>
										</div>
									</div>

									<Button
										type="submit"
										className="w-full"
										disabled={isProcessing || processPayment.isPending}
										size="lg"
									>
										{isProcessing ? "Processando..." : "Confirmar Pagamento"}
									</Button>
								</form>
							</CardContent>
						</Card>
					</div>

					{/* Order Summary */}
					<div>
						<Card>
							<CardHeader>
								<CardTitle>Resumo do Pedido</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div>
										<h4 className="mb-1 font-semibold">
											{booking.service.title}
										</h4>
										<p className="text-gray-600 text-sm">
											{booking.service.category.name}
										</p>
									</div>

									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-gray-600">Data</span>
											<span>
												{new Date(booking.bookingDate).toLocaleDateString(
													"pt-BR",
												)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-gray-600">Horário</span>
											<span>
												{new Date(booking.bookingDate).toLocaleTimeString(
													"pt-BR",
													{
														hour: "2-digit",
														minute: "2-digit",
													},
												)}
											</span>
										</div>
									</div>

									<div className="border-t pt-4">
										<div className="flex justify-between font-semibold text-lg">
											<span>Total</span>
											<span className="text-indigo-600">
												R$ {booking.totalPrice.toFixed(2)}
											</span>
										</div>
									</div>

									<div className="rounded-lg bg-gray-50 p-3 text-gray-600 text-xs">
										<p className="mb-2">
											Ao confirmar o pagamento, você concorda com os termos de
											serviço.
										</p>
										<p>
											O valor será retido até a conclusão do serviço e liberado
											ao profissional após 15 dias.
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</main>
	);
}
