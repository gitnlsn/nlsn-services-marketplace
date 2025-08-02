# Task: Implement backend endpoint for creating booking records

## Description
Implement the backend API endpoint responsible for creating new booking records in the database. This endpoint will receive booking details from the frontend, validate them, and initiate the payment process.

## Acceptance Criteria
*   A new API endpoint (e.g., `POST /api/bookings`) is created to handle booking creation requests.
*   The endpoint performs server-side validation of incoming booking data (service ID, client ID, date, time, etc.).
*   Upon successful validation, a new booking record is created in the PostgreSQL database using Prisma ORM.
*   The endpoint initiates the payment process (e.g., by calling a payment service or returning necessary payment initiation data to the frontend).
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 201 Created for success, 400 Bad Request for validation errors, 500 Internal Server Error for unexpected issues).

## Technical Notes
*   Define a tRPC procedure for booking creation.
*   Utilize Zod for robust server-side schema validation of the incoming request body.
*   Use Prisma client to interact with the PostgreSQL database for creating new `Booking` records.
*   Consider how to integrate with the payment gateway (Pagarme) at this stage.
*   Ensure proper error handling and logging for debugging.
