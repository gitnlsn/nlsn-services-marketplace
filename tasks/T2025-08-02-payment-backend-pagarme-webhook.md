# Task: Implement backend webhook to handle Pagarme payment success notifications

## Description
Implement a backend webhook endpoint to receive and process real-time payment success notifications from Pagarme. This webhook will be crucial for updating booking and transaction statuses in our database.

## Acceptance Criteria
*   A dedicated backend webhook endpoint (e.g., `POST /api/webhooks/pagarme`) is created to receive notifications from Pagarme.
*   The webhook successfully verifies the authenticity of incoming requests from Pagarme (e.g., using a signature header).
*   Upon receiving a payment success notification, the webhook extracts relevant payment and booking information.
*   The webhook triggers the update of the corresponding booking/transaction status in our database.
*   The webhook responds with an appropriate HTTP status code (e.g., 200 OK) to acknowledge receipt.

## Technical Notes
*   Implement a tRPC procedure or a dedicated Next.js API route for the webhook.
*   Follow Pagarme's documentation for webhook signature verification to ensure security.
*   Use Prisma client to update `Booking` and `Transaction` records in the database.
*   Consider implementing a robust retry mechanism for database updates in case of transient errors.
*   Ensure the webhook is idempotent to handle duplicate notifications gracefully.
