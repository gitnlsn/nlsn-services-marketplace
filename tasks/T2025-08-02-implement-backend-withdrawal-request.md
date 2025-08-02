# Task: Implement backend endpoint for initiating withdrawal requests

## Description
Implement the backend API endpoint responsible for initiating withdrawal requests from professionals. This endpoint will validate the request, interact with the Pagarme API to transfer funds, and update the professional's balance and withdrawal status in the database.

## Acceptance Criteria
*   A new API endpoint (e.g., `POST /api/withdrawals`) is created to handle withdrawal requests.
*   The endpoint performs server-side validation of the withdrawal request (e.g., sufficient balance, valid amount, valid bank account details).
*   The backend integrates with the Pagarme API to initiate the transfer of funds to the professional's registered bank account.
*   Upon successful initiation of the transfer, the professional's available balance is updated, and a withdrawal record is created/updated in the database.
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 200 OK for success, 400 Bad Request for validation errors, 500 Internal Server Error for Pagarme API failures or database issues).

## Technical Notes
*   Define a tRPC procedure for withdrawal requests.
*   Utilize Zod for robust server-side schema validation.
*   Use Prisma client to interact with the PostgreSQL database for updating `User` balances and creating `Withdrawal` records.
*   Integrate with Pagarme's transfer or payout API for initiating the actual fund transfer.
*   Ensure proper error handling and logging for all steps of the withdrawal process.
