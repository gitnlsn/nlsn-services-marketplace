import { TRPCError } from "@trpc/server";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it } from "vitest";
import { createUserService } from "~/server/services/user-service";
import {
	cleanupTestDatabase,
	setupTestDatabase,
	testDb,
	testUsers,
} from "../setup";
import { asPrismaClient } from "../types";

describe("UserService Integration Tests", () => {
	beforeEach(async () => {
		await cleanupTestDatabase();
		await setupTestDatabase();
		// Reset all mocks before each test
		for (const model of Object.values(testDb)) {
			if (typeof model === "object" && model !== null) {
				for (const method of Object.values(model)) {
					if (typeof method === "function" && "mockReset" in method) {
						(method as Mock).mockReset();
					}
				}
			}
		}
	});

	describe("updateProfile", () => {
		it("should successfully update user profile", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.client,
			});

			const updateData = {
				name: "Updated Name",
				phone: "11988887777",
				bio: "Updated bio",
			};

			const updatedUser = {
				...testUsers.client,
				...updateData,
				updatedAt: new Date(),
			};

			// Mock the update call
			testDb.user.update.mockResolvedValue(updatedUser);

			const result = await userService.updateProfile(updateData);

			expect(result.name).toBe(updateData.name);
			expect(result.phone).toBe(updateData.phone);
			expect(result.bio).toBe(updateData.bio);
			expect(result.id).toBe(testUsers.client.id);

			// Verify the update was called with correct params
			expect(testDb.user.update).toHaveBeenCalledWith({
				where: { id: testUsers.client.id },
				data: updateData,
			});
		});

		it("should throw error when user not authenticated", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
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
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
			});

			// Mock the findUnique call
			testDb.user.findUnique.mockResolvedValue(testUsers.professional);

			const result = await userService.getCurrentUser();

			expect(result.id).toBe(testUsers.professional.id);
			expect(result.name).toBe(testUsers.professional.name);
			expect(result.isProfessional).toBe(true);
			expect(result.accountBalance).toBe(testUsers.professional.accountBalance);
		});

		it("should throw error when user not found", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
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
				db: asPrismaClient(testDb),
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

			const createdBankAccount = {
				id: "bank-account-id",
				...bankAccountData,
				userId: testUsers.professional.id,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock findFirst to check for duplicates
			testDb.bankAccount.findFirst.mockResolvedValue(null);
			// Mock updateMany to unset other defaults
			testDb.bankAccount.updateMany.mockResolvedValue({ count: 0 });
			// Mock create
			testDb.bankAccount.create.mockResolvedValue(createdBankAccount);

			const result = await userService.addBankAccount(bankAccountData);

			expect(result.bankName).toBe(bankAccountData.bankName);
			expect(result.accountNumber).toBe(bankAccountData.accountNumber);
			expect(result.isDefault).toBe(true);
			expect(result.userId).toBe(testUsers.professional.id);
		});

		it("should throw error for non-professional user", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
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
				db: asPrismaClient(testDb),
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

			const existingAccount = {
				id: "existing-account",
				...bankAccountData,
				userId: testUsers.professional.id,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock findFirst to find existing account
			testDb.bankAccount.findFirst.mockResolvedValue(existingAccount);

			// Try to add duplicate
			await expect(userService.addBankAccount(bankAccountData)).rejects.toThrow(
				TRPCError,
			);
		});

		it("should unset other default accounts when setting new default", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
			});

			const secondAccountData = {
				bankName: "Second Bank",
				accountType: "savings" as const,
				accountNumber: "22222",
				agencyNumber: "2222",
				holderName: "Test Professional",
				holderCpf: "12345678901",
				isDefault: true,
			};

			const createdSecondAccount = {
				id: "second-account-id",
				...secondAccountData,
				userId: testUsers.professional.id,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock findFirst to check no duplicates
			testDb.bankAccount.findFirst.mockResolvedValue(null);
			// Mock updateMany to unset other defaults
			testDb.bankAccount.updateMany.mockResolvedValue({ count: 1 });
			// Mock create for second account
			testDb.bankAccount.create.mockResolvedValue(createdSecondAccount);

			const secondAccount = await userService.addBankAccount(secondAccountData);

			// Verify updateMany was called to unset other defaults
			expect(testDb.bankAccount.updateMany).toHaveBeenCalledWith({
				where: {
					userId: testUsers.professional.id,
					isDefault: true,
				},
				data: { isDefault: false },
			});

			expect(secondAccount.isDefault).toBe(true);
		});
	});

	describe("becomeProfessional", () => {
		it("should upgrade client to professional", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.client,
			});

			const upgradedUser = {
				...testUsers.client,
				isProfessional: true,
				professionalSince: new Date(),
				updatedAt: new Date(),
			};

			// Mock the update
			testDb.user.update.mockResolvedValue(upgradedUser);
			// Mock notification creation
			testDb.notification.create.mockResolvedValue({
				id: "notification-id",
				userId: testUsers.client.id,
				type: "professional_welcome",
				title: "Welcome, Professional!",
				message:
					"Congratulations! You are now registered as a professional. You can start offering your services.",
				read: false,
				data: null,
				createdAt: new Date(),
			});

			const result = await userService.becomeProfessional();

			expect(result.isProfessional).toBe(true);
			expect(result.professionalSince).toBeTruthy();

			// Verify update was called
			expect(testDb.user.update).toHaveBeenCalledWith({
				where: { id: testUsers.client.id },
				data: {
					isProfessional: true,
					professionalSince: expect.any(Date),
				},
			});
		});

		it("should throw error if user is already professional", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
			});

			await expect(userService.becomeProfessional()).rejects.toThrow(TRPCError);
		});
	});

	describe("requestWithdrawal", () => {
		it("should process withdrawal request successfully", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
			});

			const withdrawalData = {
				amount: 50.0,
				bankAccountId: "test-bank-account-id",
			};

			const bankAccount = {
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
			};

			const withdrawal = {
				id: "withdrawal-id",
				userId: testUsers.professional.id,
				amount: withdrawalData.amount,
				bankAccountId: withdrawalData.bankAccountId,
				status: "pending",
				requestDate: new Date(),
				processedDate: null,
				transactionId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Mock bank account lookup
			testDb.bankAccount.findUnique.mockResolvedValue(bankAccount);
			// Mock withdrawal creation
			testDb.withdrawal.create.mockResolvedValue(withdrawal);
			// Mock user update
			testDb.user.update.mockResolvedValue({
				...testUsers.professional,
				accountBalance: 50.0,
			});
			// Mock notification creation
			testDb.notification.create.mockResolvedValue({
				id: "notification-id",
				userId: testUsers.professional.id,
				type: "withdrawal_requested",
				title: "Withdrawal Requested",
				message: "Your withdrawal request has been submitted.",
				read: false,
				data: null,
				createdAt: new Date(),
			});

			const result = await userService.requestWithdrawal(withdrawalData);

			expect(result.amount).toBe(withdrawalData.amount);
			expect(result.bankAccountId).toBe(withdrawalData.bankAccountId);
			expect(result.status).toBe("pending");
		});

		it("should throw error for insufficient balance", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
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
				db: asPrismaClient(testDb),
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
				db: asPrismaClient(testDb),
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
		it("should return accurate earnings summary", async () => {
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUsers.professional,
			});

			// Mock payment aggregate for total earnings
			testDb.payment.aggregate.mockResolvedValue({
				_sum: { netAmount: 90.0 },
				_count: null,
				_avg: null,
				_max: null,
				_min: null,
			});

			// Mock payment aggregate for pending escrow
			testDb.payment.aggregate.mockResolvedValueOnce({
				_sum: { netAmount: 0 },
				_count: null,
				_avg: null,
				_max: null,
				_min: null,
			});

			// Mock withdrawal aggregate for total withdrawn
			testDb.withdrawal.aggregate.mockResolvedValue({
				_sum: { amount: 40.0 },
				_count: null,
				_avg: null,
				_max: null,
				_min: null,
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
				db: asPrismaClient(testDb),
				currentUser: testUsers.client,
			});

			await expect(userService.getEarningsSummary()).rejects.toThrow(TRPCError);
		});
	});
});
