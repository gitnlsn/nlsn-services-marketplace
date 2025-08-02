# Task: Integrate with Pagarme API for processing payments (credit cards, Pix, boleto)

## Description
Integrate the backend with the Pagarme API to process various payment methods, including credit cards, Pix, and boleto. This involves making API calls to Pagarme for payment authorization and capture.

## Acceptance Criteria
*   The backend can successfully initiate payment processing with Pagarme for credit card transactions.
*   The backend can successfully initiate payment processing with Pagarme for Pix transactions, returning necessary QR code or copy-paste information.
*   The backend can successfully initiate payment processing with Pagarme for boleto transactions, returning necessary barcode or printable boleto information.
*   Securely handle Pagarme API keys and credentials.
*   Appropriate error handling is implemented for Pagarme API call failures.

## Technical Notes
*   Utilize Pagarme's official SDK or construct direct API calls as per their documentation.
*   Ensure all sensitive payment data is handled securely and never stored directly on our servers.
*   Consider idempotency keys for payment requests to prevent duplicate charges.
*   Implement logging for payment processing steps for auditing and debugging.
