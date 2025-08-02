# Task: Implement Payment Screen

## Description
Create a comprehensive Payment Screen that integrates with Pagarme to support multiple Brazilian payment methods including credit cards, PIX, and boleto. The screen should provide a secure, user-friendly payment experience with clear order summary and payment status feedback.

## Acceptance Criteria
* Order summary sidebar showing:
  - Service details and selected options
  - Price breakdown (service fee, platform fee, total)
  - Booking date and time
* Payment method selection cards:
  - Credit/Debit card with recognizable icons
  - PIX with instant payment option
  - Boleto with due date selection
* Saved payment methods list for returning users
* Credit card form with:
  - Card number formatting with spaces
  - CVV and expiry date masks
  - Real-time card brand detection (Visa, Mastercard, etc.)
  - PCI DSS compliant iframe integration
* PIX payment flow:
  - QR code generation
  - Copy-to-clipboard for PIX key
  - 30-minute expiration timer
  - Real-time payment status updates
* Boleto generation:
  - PDF download option
  - Barcode display
  - Due date selector (3/5/7 days)
  - Email boleto option
* Security badges display (SSL, PCI compliance)
* Terms and conditions checkbox
* Processing state with loading indicator
* Success/error handling with clear messaging
* Receipt download option after successful payment

## Technical Implementation
* **Components to create:**
  - `PaymentScreen.tsx` - Main payment container
  - `OrderSummary.tsx` - Order details sidebar
  - `PaymentMethodSelector.tsx` - Payment method cards
  - `CreditCardForm.tsx` - PCI compliant card form
  - `PIXPayment.tsx` - PIX payment component
  - `BoletoPayment.tsx` - Boleto generation component
  - `PaymentStatus.tsx` - Status display component
  - `SecurityBadges.tsx` - Trust indicators

* **Pagarme integration:**
  - Install `@pagarme/react-native-sdk`
  - Configure API keys from environment variables
  - Implement card tokenization
  - Handle 3D Secure authentication flow
  - Set up webhook endpoint for payment notifications

* **tRPC API calls:**
  - `payments.createIntent(bookingId, method)` - Initialize payment
  - `payments.processCard(token, paymentIntent)` - Process card payment
  - `payments.generatePix(paymentIntent)` - Generate PIX QR code
  - `payments.generateBoleto(paymentIntent, dueDate)` - Create boleto
  - `payments.getStatus(paymentId)` - Check payment status
  - `savedPayments.list()` - Get saved payment methods
  - `savedPayments.add(paymentMethod)` - Save new payment method

* **Real-time updates:**
  - WebSocket connection for PIX payment status
  - Polling fallback for payment confirmation
  - Automatic redirect on successful payment

* **Security measures:**
  - HTTPS enforcement
  - Card data never touches backend
  - HMAC validation for webhooks
  - Rate limiting on payment endpoints

## Dependencies
* Pagarme SDK
* React Hook Form for form validation
* QRCode.js for PIX QR generation
* WebSocket client for real-time updates
* PDF generation library for boleto

## Related Tasks
* T2025-08-02-integrate-pagarme-api.md - Pagarme backend integration
* T2025-08-02-implement-pagarme-webhook.md - Webhook implementation
* T2025-08-02-implement-escrow-logic.md - Escrow system
* T2025-08-02-implement-booking-confirmation-screen.md - Post-payment confirmation