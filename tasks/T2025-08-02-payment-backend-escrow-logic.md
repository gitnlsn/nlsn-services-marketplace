# Task: Implement escrow logic: hold funds until service completion, then release to professional's account after 15-day holding period

## Description
Implement the backend escrow logic to securely hold funds after a client's payment until the service is marked as complete. After completion, the funds should be held for an additional 15-day dispute resolution period before being released to the professional's account.

## Acceptance Criteria
*   Funds are marked as "held" in the system upon successful payment and booking confirmation.
*   A mechanism exists to track the completion status of a service.
*   Upon service completion, a 15-day holding period is initiated for the funds.
*   After the 15-day holding period, the funds are automatically released to the professional's available balance.
*   The system can handle dispute resolution during the holding period, potentially pausing or reversing fund release.

## Technical Notes
*   This will involve modifications to the `Booking` and `Transaction` models in Prisma to include status fields for escrow and holding periods.
*   Consider a scheduled job or a cron job to periodically check for completed services and expired holding periods to trigger fund release.
*   Integrate with Pagarme's payout or transfer API for the actual fund release to the professional's bank account.
*   Implement robust logging for all escrow-related state changes and fund movements.
