import { TRPCError } from "@trpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UserService } from "~/server/services/user.service";
import {
	createTestProfessional,
	createTestUser,
	setupTestDatabase,
	teardownTestDatabase,
	testDb,
} from "../helpers/database";

describe("UserService Integration Tests", () => {
	setupTestDatabase();

	let userService: UserService;

	beforeAll(() => {
		userService = new UserService(testDb);
	});

	afterAll(async () => {
		await teardownTestDatabase();
	});

	describe("getCurrentUser", () => {
		it("should return user data for existing user", async () => {
			const testUser = await createTestUser();

			const result = await userService.getCurrentUser(testUser.id);

			expect(result).toMatchObject({
				id: testUser.id,
				email: testUser.email,
				name: testUser.name,
				isProfessional: false,
				notificationEmail: true,
			});
		});

		it("should throw NOT_FOUND error for non-existent user", async () => {
			await expect(
				userService.getCurrentUser("non-existent-id"),
			).rejects.toThrow(TRPCError);
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

			const result = await userService.updateProfile(testUser.id, updateData);

			expect(result.name).toBe(updateData.name);
			expect(result.bio).toBe(updateData.bio);
			expect(result.phone).toBe(updateData.phone);
		});

		it("should handle partial updates", async () => {
			const testUser = await createTestUser();
			const updateData = { name: "Partial Update" };

			const result = await userService.updateProfile(testUser.id, updateData);

			expect(result.name).toBe(updateData.name);
			expect(result.email).toBe(testUser.email); // Unchanged
		});
	});

	describe("getUserById", () => {
		it("should return public user data", async () => {
			const testUser = await createTestUser();

			const result = await userService.getUserById(testUser.id);

			expect(result).toMatchObject({
				id: testUser.id,
				name: testUser.name,
				image: testUser.image,
				isProfessional: false,
			});
			expect(result.avgRating).toBeNull();
		});

		it("should calculate average rating for professionals", async () => {
			const testPro = await createTestProfessional();
			const testClient = await createTestUser();

			// Create test category and service first
			const testCategory = await testDb.category.create({
				data: {
					name: "Test Category",
				},
			});

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

			const result = await userService.getUserById(testPro.id);

			expect(result.isProfessional).toBe(true);
			expect(result.avgRating).toBe(4.5);
		});

		it("should throw NOT_FOUND for non-existent user", async () => {
			await expect(userService.getUserById("non-existent-id")).rejects.toThrow(
				TRPCError,
			);
		});
	});

	describe("becomeProfessional", () => {
		it("should convert user to professional successfully", async () => {
			const testUser = await createTestUser();
			const professionalData = {
				cpf: "12345678901",
				phone: "11999999999",
				bio: "Professional bio with more than 50 characters to meet validation",
				address: "Professional Address, 123",
				city: "São Paulo",
				state: "SP",
				zipCode: "01234567",
				acceptTerms: true,
			};

			const result = await userService.becomeProfessional(
				testUser.id,
				professionalData,
			);

			expect(result.isProfessional).toBe(true);
			expect(result.cpf).toBe(professionalData.cpf);
			expect(result.professionalSince).toBeInstanceOf(Date);
		});

		it("should reject if terms not accepted", async () => {
			const testUser = await createTestUser();
			const professionalData = {
				cpf: "12345678901",
				phone: "11999999999",
				bio: "Professional bio with more than 50 characters to meet validation",
				address: "Professional Address, 123",
				city: "São Paulo",
				state: "SP",
				zipCode: "01234567",
				acceptTerms: false,
			};

			await expect(
				userService.becomeProfessional(testUser.id, professionalData),
			).rejects.toThrow("You must accept the terms");
		});

		it("should reject if user is already professional", async () => {
			const testPro = await createTestProfessional();
			const professionalData = {
				cpf: "98765432100",
				phone: "11888888888",
				bio: "Another professional bio with more than 50 characters",
				address: "Another Address, 456",
				city: "Rio de Janeiro",
				state: "RJ",
				zipCode: "98765432",
				acceptTerms: true,
			};

			await expect(
				userService.becomeProfessional(testPro.id, professionalData),
			).rejects.toThrow("User is already a professional");
		});

		it("should reject if CPF already exists", async () => {
			const existingPro = await createTestProfessional({
				cpf: "12345678901",
			});
			const testUser = await createTestUser();

			const professionalData = {
				cpf: "12345678901", // Same CPF
				phone: "11999999999",
				bio: "Professional bio with more than 50 characters to meet validation",
				address: "Professional Address, 123",
				city: "São Paulo",
				state: "SP",
				zipCode: "01234567",
				acceptTerms: true,
			};

			await expect(
				userService.becomeProfessional(testUser.id, professionalData),
			).rejects.toThrow("CPF already registered");
		});
	});

	describe("updateNotificationPreferences", () => {
		it("should update notification preferences", async () => {
			const testUser = await createTestUser();
			const preferences = {
				notificationEmail: false,
				notificationSms: true,
				notificationWhatsapp: true,
			};

			const result = await userService.updateNotificationPreferences(
				testUser.id,
				preferences,
			);

			expect(result.notificationEmail).toBe(false);
			expect(result.notificationSms).toBe(true);
			expect(result.notificationWhatsapp).toBe(true);
		});
	});

	describe("addBankAccount", () => {
		it("should add bank account for professional", async () => {
			const testPro = await createTestProfessional();
			const bankData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "123456789",
				agencyNumber: "1234",
				holderName: "Professional User",
				holderCpf: "12345678901",
				isDefault: true,
			};

			const result = await userService.addBankAccount(testPro.id, bankData);

			expect(result.bankName).toBe(bankData.bankName);
			expect(result.isDefault).toBe(true);
		});

		it("should reject for non-professional users", async () => {
			const testUser = await createTestUser();
			const bankData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "123456789",
				agencyNumber: "1234",
				holderName: "User",
				holderCpf: "12345678901",
			};

			await expect(
				userService.addBankAccount(testUser.id, bankData),
			).rejects.toThrow("Only professionals can add bank accounts");
		});

		it("should reject duplicate bank accounts", async () => {
			const testPro = await createTestProfessional();
			const bankData = {
				bankName: "Test Bank",
				accountType: "checking" as const,
				accountNumber: "123456789",
				agencyNumber: "1234",
				holderName: "Professional User",
				holderCpf: "12345678901",
			};

			// Add first account
			await userService.addBankAccount(testPro.id, bankData);

			// Try to add duplicate
			await expect(
				userService.addBankAccount(testPro.id, bankData),
			).rejects.toThrow("Bank account already exists");
		});
	});

	describe("requestWithdrawal", () => {
		it("should create withdrawal request for professional with sufficient balance", async () => {
			const testPro = await createTestProfessional({
				accountBalance: 50000, // R$ 500.00
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
			};

			const result = await userService.requestWithdrawal(
				testPro.id,
				withdrawalRequest,
			);

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

			const withdrawalRequest = {
				amount: 20000, // R$ 200.00
			};

			await expect(
				userService.requestWithdrawal(testPro.id, withdrawalRequest),
			).rejects.toThrow("Insufficient balance");
		});

		it("should reject withdrawal for non-professional", async () => {
			const testUser = await createTestUser();
			const withdrawalRequest = {
				amount: 10000,
			};

			await expect(
				userService.requestWithdrawal(testUser.id, withdrawalRequest),
			).rejects.toThrow("Only professionals can request withdrawals");
		});
	});
});
