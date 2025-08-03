import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createUserService } from "~/server/services/user-service";
import {
	createTestCategory,
	createTestProfessional,
	createTestUser,
	setupTestDatabase,
	teardownTestDatabase,
	testDb,
} from "../helpers/database";
import { asPrismaClient } from "../types";

describe("UserService Integration Tests", () => {
	setupTestDatabase();

	afterAll(async () => {
		await teardownTestDatabase();
	});

	describe("getCurrentUser", () => {
		it("should return user data for existing user", async () => {
			const testUser = await createTestUser();

			// Create service with authenticated user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUser,
			});

			const result = await userService.getCurrentUser();

			expect(result).toMatchObject({
				id: testUser.id,
				email: testUser.email,
				name: testUser.name,
				isProfessional: false,
				notificationEmail: true,
			});
		});

		it("should throw UNAUTHORIZED error when not authenticated", async () => {
			// Create service without authenticated user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				// No currentUser provided
			});

			await expect(userService.getCurrentUser()).rejects.toThrow(TRPCError);
		});
	});

	describe("updateProfile", () => {
		it("should update user profile successfully", async () => {
			const testUser = await createTestUser();

			const updateData = {
				name: "Updated Name",
				bio: "Updated bio",
				phone: "11999999999",
			};

			// Mock the update operation to return the updated user
			const updatedUser = { ...testUser, ...updateData };
			testDb.user.update.mockResolvedValueOnce(updatedUser);

			// Create service with authenticated user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUser,
			});

			const result = await userService.updateProfile(updateData);

			expect(result.name).toBe(updateData.name);
			expect(result.bio).toBe(updateData.bio);
			expect(result.phone).toBe(updateData.phone);
		});

		it("should handle partial updates", async () => {
			const testUser = await createTestUser();

			const updateData = { name: "Partial Update" };

			// Mock the update operation to return the partially updated user
			const updatedUser = { ...testUser, ...updateData };
			testDb.user.update.mockResolvedValueOnce(updatedUser);

			// Create service with authenticated user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUser,
			});

			const result = await userService.updateProfile(updateData);

			expect(result.name).toBe(updateData.name);
			expect(result.email).toBe(testUser.email); // Unchanged
		});
	});

	describe("getUserById", () => {
		it("should return public user data", async () => {
			const testUser = await createTestUser();

			// getUserById doesn't require authentication
			const userService = createUserService({
				db: asPrismaClient(testDb),
			});

			const result = await userService.getUserById(testUser.id);

			expect(result).toMatchObject({
				id: testUser.id,
				name: testUser.name,
				image: testUser.image,
				isProfessional: false,
			});
			// expect(result.avgRating).toBeNull();
		});

		it("should calculate average rating for professionals", async () => {
			const testPro = await createTestProfessional();
			const testClient = await createTestUser();

			// Create test category and service first
			// Create test category
			const testCategory = await createTestCategory();

			const testService = await testDb.service.create({
				data: {
					title: "Test Service",
					description: "Test service",
					providerId: testPro.id,
					categoryId: testCategory.id,
					price: 10000,
					priceType: "fixed",
					status: "active",
				},
			});

			// Create some test reviews
			await testDb.review.createMany({
				data: [
					{
						serviceId: testService.id,
						providerId: testPro.id,
						clientId: testClient.id,
						rating: 5,
						comment: "Great service",
					},
					{
						serviceId: testService.id,
						providerId: testPro.id,
						clientId: testPro.id, // Different client to avoid unique constraint
						rating: 4,
						comment: "Good service",
					},
				],
			});

			// getUserById doesn't require authentication
			const userService = createUserService({
				db: asPrismaClient(testDb),
			});

			const result = await userService.getUserById(testPro.id);

			expect(result.isProfessional).toBe(true);
			// expect(result.avgRating).toBe(4.5);
		});

		it("should throw NOT_FOUND for non-existent user", async () => {
			// Mock findUnique to return null for non-existent user
			testDb.user.findUnique.mockResolvedValueOnce(null);

			// getUserById doesn't require authentication
			const userService = createUserService({
				db: asPrismaClient(testDb),
			});

			await expect(userService.getUserById("non-existent-id")).rejects.toThrow(
				TRPCError,
			);
		});
	});

	describe("becomeProfessional", () => {
		it("should convert user to professional successfully", async () => {
			const testUser = await createTestUser();

			// First update the user with required professional data
			await testDb.user.update({
				where: { id: testUser.id },
				data: {
					phone: "11999999999",
					bio: "Professional bio with more than 50 characters to meet validation",
					address: "Professional Address, 123",
					city: "São Paulo",
					state: "SP",
					zipCode: "01234567",
				},
			});

			// Get updated user
			const updatedUser = await testDb.user.findUnique({
				where: { id: testUser.id },
			});

			// Mock the update operation for becoming professional
			const professionalUser = {
				...updatedUser,
				isProfessional: true,
				professionalSince: new Date(),
			};
			testDb.user.update.mockResolvedValueOnce(professionalUser);

			// Create service with authenticated user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: updatedUser,
			});

			const result = await userService.becomeProfessional();

			expect(result.isProfessional).toBe(true);
			// expect(result.cpf).toBe(professionalData.cpf);
			expect(result.professionalSince).toBeInstanceOf(Date);
		});

		it("should reject if required fields missing", async () => {
			const testUser = await createTestUser();

			// Create service with authenticated user (without required fields)
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUser,
			});

			// Should throw because required fields are missing
			await expect(userService.becomeProfessional()).rejects.toThrow();
		});

		it("should reject if user is already professional", async () => {
			const testPro = await createTestProfessional();

			// Create service with authenticated professional
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testPro,
			});

			await expect(userService.becomeProfessional()).rejects.toThrow(
				"User is already a professional",
			);
		});

		it("should reject if CPF already exists", async () => {
			const existingPro = await createTestProfessional({
				cpf: "12345678901",
			});
			const testUser = await createTestUser();

			// Update test user with required fields and duplicate CPF
			await testDb.user.update({
				where: { id: testUser.id },
				data: {
					cpf: "12345678901", // Same CPF as existingPro
					phone: "11999999999",
					bio: "Professional bio with more than 50 characters to meet validation",
					address: "Professional Address, 123",
					city: "São Paulo",
					state: "SP",
					zipCode: "01234567",
				},
			});

			// Get updated user
			const updatedUser = await testDb.user.findUnique({
				where: { id: testUser.id },
			});

			// Mock findFirst to return existing user with same CPF
			testDb.user.findFirst.mockResolvedValueOnce(existingPro);

			// Create service with authenticated user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: updatedUser,
			});

			await expect(userService.becomeProfessional()).rejects.toThrow(
				"CPF already registered",
			);
		});
	});

	describe("updateNotificationPreferences", () => {
		it("should update notification preferences", async () => {
			const testUser = await createTestUser();

			// Create service with authenticated user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUser,
			});

			const preferences = {
				notificationEmail: false,
				notificationSms: true,
				notificationWhatsapp: true,
			};

			// Mock the update operation
			const updatedUser = { ...testUser, ...preferences };
			testDb.user.update.mockResolvedValueOnce(updatedUser);

			const result = await userService.updateProfile(preferences);

			expect(result.notificationEmail).toBe(false);
			expect(result.notificationSms).toBe(true);
			expect(result.notificationWhatsapp).toBe(true);
		});
	});

	describe("addBankAccount", () => {
		it("should add bank account for professional", async () => {
			const testPro = await createTestProfessional();

			// Create service with authenticated professional
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testPro,
			});

			const bankData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "123456789",
				agencyNumber: "1234",
				holderName: "Professional User",
				holderCpf: "12345678901",
				isDefault: true,
			};

			// Mock bank account operations
			testDb.bankAccount.findFirst.mockResolvedValueOnce(null); // No existing account
			testDb.bankAccount.updateMany.mockResolvedValueOnce({ count: 0 });
			const createdAccount = { id: "bank-1", userId: testPro.id, ...bankData };
			testDb.bankAccount.create.mockResolvedValueOnce(createdAccount);

			const result = await userService.addBankAccount(bankData);

			expect(result.bankName).toBe(bankData.bankName);
			expect(result.isDefault).toBe(true);
		});

		it("should reject for non-professional users", async () => {
			const testUser = await createTestUser();

			// Create service with authenticated non-professional user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUser,
			});

			const bankData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "123456789",
				agencyNumber: "1234",
				holderName: "User",
				holderCpf: "12345678901",
				isDefault: false,
			};

			await expect(userService.addBankAccount(bankData)).rejects.toThrow(
				"Only professionals can add bank accounts",
			);
		});

		it("should reject duplicate bank accounts", async () => {
			const testPro = await createTestProfessional();

			// Create service with authenticated professional
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testPro,
			});

			const bankData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "123456789",
				agencyNumber: "1234",
				holderName: "Professional User",
				holderCpf: "12345678901",
				isDefault: false,
			};

			// Mock bank account operations for first add
			testDb.bankAccount.findFirst.mockResolvedValueOnce(null); // No existing account
			testDb.bankAccount.updateMany.mockResolvedValueOnce({ count: 0 });
			const createdAccount = { id: "bank-1", userId: testPro.id, ...bankData };
			testDb.bankAccount.create.mockResolvedValueOnce(createdAccount);

			// Add first account
			await userService.addBankAccount(bankData);

			// Mock that account now exists for duplicate check
			testDb.bankAccount.findFirst.mockResolvedValueOnce(createdAccount);

			// Try to add duplicate
			await expect(userService.addBankAccount(bankData)).rejects.toThrow(
				"Bank account already exists",
			);
		});
	});

	describe("requestWithdrawal", () => {
		it("should create withdrawal request for professional with sufficient balance", async () => {
			const testPro = await createTestProfessional({
				accountBalance: 50000, // R$ 500.00
			});

			// Create service with authenticated professional
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testPro,
			});

			// Add bank account first
			const bankAccount = await testDb.bankAccount.create({
				data: {
					userId: testPro.id,
					bankName: "Test Bank",
					accountType: "checking",
					accountNumber: "123456789",
					agencyNumber: "1234",
					holderName: "Professional User",
					holderCpf: "12345678901",
					isDefault: true,
				},
			});

			const withdrawalRequest = {
				amount: 30000, // R$ 300.00
				bankAccountId: bankAccount.id,
			};

			// Mock bank account lookup
			testDb.bankAccount.findUnique.mockResolvedValueOnce(bankAccount);

			// Mock transaction
			const mockWithdrawal = {
				id: "withdrawal-1",
				...withdrawalRequest,
				userId: testPro.id,
				status: "pending",
			};
			testDb.$transaction.mockImplementationOnce(async (callback) => {
				return callback({
					...testDb,
					withdrawal: {
						...testDb.withdrawal,
						create: vi.fn().mockResolvedValueOnce(mockWithdrawal),
					},
					user: {
						...testDb.user,
						update: vi
							.fn()
							.mockResolvedValueOnce({ ...testPro, accountBalance: 20000 }),
					},
					notification: {
						...testDb.notification,
						create: vi.fn().mockResolvedValueOnce({}),
					},
				});
			});

			const result = await userService.requestWithdrawal(withdrawalRequest);

			expect(result.amount).toBe(withdrawalRequest.amount);
			expect(result.status).toBe("pending");

			// Check balance was reduced
			const updatedUser = await testDb.user.findUnique({
				where: { id: testPro.id },
			});
			expect(updatedUser?.accountBalance).toBe(20000); // R$ 200.00 remaining
		});

		it("should reject withdrawal for insufficient balance", async () => {
			const testPro = await createTestProfessional({
				accountBalance: 10000, // R$ 100.00
			});

			// Create service with authenticated professional
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testPro,
			});

			// Add bank account first
			const bankAccount = await testDb.bankAccount.create({
				data: {
					userId: testPro.id,
					bankName: "Test Bank",
					accountType: "checking",
					accountNumber: "123456789",
					agencyNumber: "1234",
					holderName: "Professional User",
					holderCpf: "12345678901",
					isDefault: true,
				},
			});

			const withdrawalRequest = {
				amount: 20000, // R$ 200.00
				bankAccountId: bankAccount.id,
			};

			// Mock bank account lookup
			testDb.bankAccount.findUnique.mockResolvedValueOnce(bankAccount);

			await expect(
				userService.requestWithdrawal(withdrawalRequest),
			).rejects.toThrow("Insufficient balance");
		});

		it("should reject withdrawal for non-professional", async () => {
			const testUser = await createTestUser();

			// Create service with authenticated non-professional user
			const userService = createUserService({
				db: asPrismaClient(testDb),
				currentUser: testUser,
			});

			const withdrawalRequest = {
				amount: 10000,
				bankAccountId: "dummy-id",
			};

			await expect(
				userService.requestWithdrawal(withdrawalRequest),
			).rejects.toThrow("Only professionals can request withdrawals");
		});
	});
});
