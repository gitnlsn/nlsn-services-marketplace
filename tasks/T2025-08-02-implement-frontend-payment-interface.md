# Task: Implement frontend payment interface

## Description
Implement the frontend interface for processing payments for booked services. This interface should allow users to select payment methods (e.g., credit card, Pix, boleto) and securely enter their payment details.

## Acceptance Criteria
*   A dedicated Payment Screen is accessible after booking a service.
*   The screen presents available payment methods (credit card, Pix, boleto).
*   For credit card payments, secure input fields for card number, expiry date, and CVV are provided.
*   For Pix/boleto, instructions or relevant information for completing the payment are displayed.
*   The payment interface utilizes Shadcn UI components for a consistent look and feel.
*   Native HTML validation is implemented for all input fields (e.g., credit card number format, expiry date).
*   The interface provides clear feedback on payment processing status (e.g., loading, success, failure).

## Technical Notes
*   Utilize Shadcn UI form components and potentially custom components for payment-specific inputs.
*   Integrate with Pagarme's frontend SDK or API for secure payment data collection (if applicable and recommended by Pagarme).
*   Ensure sensitive payment information is not directly handled by the frontend but securely transmitted to the backend/Pagarme.
*   Implement proper error handling and user feedback for payment failures.
