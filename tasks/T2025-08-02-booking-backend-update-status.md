# Task: Update booking/transaction status in the database upon payment confirmation

## Description
Implement the backend logic to update the status of a booking and its associated transaction in the database upon successful payment confirmation. This will typically be triggered by the Pagarme webhook.

## Acceptance Criteria
*   Upon receiving a successful payment confirmation (e.g., from the Pagarme webhook), the relevant booking record's status is updated to "Paid" or a similar confirmed status.
*   A corresponding transaction record is created or updated in the database, reflecting the payment details and status.
*   The database updates are atomic and ensure data consistency.
*   Error handling is in place for database update failures.

## Technical Notes
*   This logic will likely reside within the Pagarme webhook handler or a service function called by it.
*   Use Prisma client to update `Booking` and `Transaction` records.
*   Consider using Prisma transactions to ensure atomicity of updates.
*   Ensure proper logging for payment confirmation and database updates.
