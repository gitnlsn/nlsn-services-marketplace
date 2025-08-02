import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import { createUserService } from "~/server/services/user-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testDb,
	testUsers,
} from "../setup";

describe("UserService Integration Tests", () => {
	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();
	});

	describe("updateProfile", () => {
		it("should successfully update user profile", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const updateData = {
				name: "Updated Name",
				phone: "11988887777",
				bio: "Updated bio",
			};

			const result = await userService.updateProfile(updateData);

			expect(result.name).toBe(updateData.name);
			expect(result.phone).toBe(updateData.phone);
			expect(result.bio).toBe(updateData.bio);
			expect(result.id).toBe(testUsers.client.id);

			// Verify database was actually updated
			const updatedUser = await testDb.user.findUnique({
				where: { id: testUsers.client.id },
			});
			expect(updatedUser?.name).toBe(updateData.name);
		});

		it("should throw error when user not authenticated", async () => {
			const userService = createUserService({
				db: testDb,
				// No currentUser provided
			});

			await expect(userService.updateProfile({ name: "Test" })).rejects.toThrow(
				TRPCError,
			);
		});
	});

	describe("getCurrentUser", () => {
		it("should return current user data", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const result = await userService.getCurrentUser();

			expect(result.id).toBe(testUsers.professional.id);
			expect(result.name).toBe(testUsers.professional.name);
			expect(result.isProfessional).toBe(true);
			expect(result.accountBalance).toBe(testUsers.professional.accountBalance);
		});

		it("should throw error when user not found", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: {
					...testUsers.client,
					id: "non-existent-id",
				},
			});

			await expect(userService.getCurrentUser()).rejects.toThrow(TRPCError);
		});
	});

	describe("addBankAccount", () => {
		it("should add bank account for professional user", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const bankAccountData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "12345",
				agencyNumber: "6789",
				holderName: "Test Professional",
				holderCpf: "12345678901",
				isDefault: true,
			};

			const result = await userService.addBankAccount(bankAccountData);

			expect(result.bankName).toBe(bankAccountData.bankName);
			expect(result.accountNumber).toBe(bankAccountData.accountNumber);
			expect(result.isDefault).toBe(true);
			expect(result.userId).toBe(testUsers.professional.id);

			// Verify database was updated
			const bankAccount = await testDb.bankAccount.findUnique({
				where: { id: result.id },
			});
			expect(bankAccount).toBeTruthy();
		});

		it("should throw error for non-professional user", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const bankAccountData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "12345",
				agencyNumber: "6789",
				holderName: "Test Client",
				holderCpf: "12345678901",
				isDefault: true,
			};

			await expect(userService.addBankAccount(bankAccountData)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should prevent duplicate bank accounts", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const bankAccountData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "12345",
				agencyNumber: "6789",
				holderName: "Test Professional",
				holderCpf: "12345678901",
				isDefault: true,
			};

			// Add first bank account
			await userService.addBankAccount(bankAccountData);

			// Try to add duplicate
			await expect(userService.addBankAccount(bankAccountData)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should unset other default accounts when setting new default", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			// Add first default account
			const firstAccount = await userService.addBankAccount({
				bankName: "First Bank",
				accountType: "checking",
				accountNumber: "11111",
				agencyNumber: "1111",
				holderName: "Test Professional",
				holderCpf: "12345678901",
				isDefault: true,
			});

			// Add second default account
			const secondAccount = await userService.addBankAccount({
				bankName: "Second Bank",
				accountType: "savings",
				accountNumber: "22222",
				agencyNumber: "2222",
				holderName: "Test Professional",
				holderCpf: "12345678901",
				isDefault: true,
			});

			// Verify first account is no longer default
			const updatedFirstAccount = await testDb.bankAccount.findUnique({
				where: { id: firstAccount.id },
			});
			expect(updatedFirstAccount?.isDefault).toBe(false);
			expect(secondAccount.isDefault).toBe(true);
		});
	});

	describe("becomeProfessional", () => {
		it("should upgrade client to professional", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.client,
			});

			const result = await userService.becomeProfessional();

			expect(result.isProfessional).toBe(true);
			expect(result.professionalSince).toBeTruthy();

			// Verify database was updated
			const updatedUser = await testDb.user.findUnique({
				where: { id: testUsers.client.id },
			});
			expect(updatedUser?.isProfessional).toBe(true);

			// Verify notification was created
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.client.id,
					type: "professional_welcome",
				},
			});
			expect(notification).toBeTruthy();
		});

		it("should throw error if user is already professional", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			await expect(userService.becomeProfessional()).rejects.toThrow(TRPCError);
		});
	});

	describe("requestWithdrawal", () => {
		beforeEach(async () => {
			// Add a bank account for withdrawal tests
			await testDb.bankAccount.create({
				data: {
					id: "test-bank-account-id",
					userId: testUsers.professional.id,
					bankName: "Test Bank",
					accountType: "checking",
					accountNumber: "12345",
					agencyNumber: "6789",
					holderName: "Test Professional",
					holderCpf: "12345678901",
					isDefault: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
		});

		it("should process withdrawal request successfully", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const withdrawalData = {
				amount: 50.0,
				bankAccountId: "test-bank-account-id",
			};

			const result = await userService.requestWithdrawal(withdrawalData);

			expect(result.amount).toBe(withdrawalData.amount);
			expect(result.bankAccountId).toBe(withdrawalData.bankAccountId);
			expect(result.status).toBe("pending");

			// Verify user balance was updated
			const updatedUser = await testDb.user.findUnique({
				where: { id: testUsers.professional.id },
			});
			expect(updatedUser?.accountBalance).toBe(50.0); // 100 - 50

			// Verify notification was created
			const notification = await testDb.notification.findFirst({
				where: {
					userId: testUsers.professional.id,
					type: "withdrawal_requested",
				},
			});
			expect(notification).toBeTruthy();
		});

		it("should throw error for insufficient balance", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const withdrawalData = {
				amount: 200.0, // More than available balance
				bankAccountId: "test-bank-account-id",
			};

			await expect(
				userService.requestWithdrawal(withdrawalData),
			).rejects.toThrow(TRPCError);
		});

		it("should throw error for non-existent bank account", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const withdrawalData = {
				amount: 50.0,
				bankAccountId: "non-existent-bank-account",
			};

			await expect(
				userService.requestWithdrawal(withdrawalData),
			).rejects.toThrow(TRPCError);
		});

		it("should throw error for amount below minimum", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const withdrawalData = {
				amount: 5.0, // Below minimum of R$ 10.00
				bankAccountId: "test-bank-account-id",
			};

			await expect(
				userService.requestWithdrawal(withdrawalData),
			).rejects.toThrow(TRPCError);
		});
	});

	describe("getEarningsSummary", () => {
		beforeEach(async () => {
			// Create test booking and payment for earnings
			const booking = await testDb.booking.create({
				data: {
					id: "test-booking-id",
					serviceId: "test-service-id",
					clientId: testUsers.client.id,
					providerId: testUsers.professional.id,
					bookingDate: new Date(),
					totalPrice: 100.0,
					status: "completed",
					completedAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			await testDb.payment.create({
				data: {
					id: "test-payment-id",
					bookingId: booking.id,
					amount: 100.0,
					status: "paid",
					serviceFee: 10.0,
					netAmount: 90.0,
					releasedAt: new Date(),
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});

			await testDb.withdrawal.create({
				data: {
					id: "test-withdrawal-id",
					userId: testUsers.professional.id,
					amount: 40.0,
					status: "completed",
					bankAccountId: "test-bank-account-id",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			});
		});

		it("should return accurate earnings summary", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.professional,
			});

			const result = await userService.getEarningsSummary();

			expect(result.totalEarnings).toBe(90.0);
			expect(result.availableBalance).toBe(
				testUsers.professional.accountBalance,
			);
			expect(result.totalWithdrawn).toBe(40.0);
			expect(result.pendingEscrow).toBe(0); // Since payment was released
		});

		it("should throw error for non-professional user", async () => {
			const userService = createUserService({
				db: testDb,
				currentUser: testUsers.client,
			});

			await expect(userService.getEarningsSummary()).rejects.toThrow(TRPCError);
		});
	});
});
