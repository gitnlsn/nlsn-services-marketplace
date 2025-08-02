# Task: Implement backend endpoint to update booking status to "Declined"

## Description
Implement the backend API endpoint responsible for updating the status of a booking to "Declined". This endpoint will be called by the frontend when a professional declines a booking request.

## Acceptance Criteria
*   A new API endpoint (e.g., `PUT /api/bookings/:id/decline` or `PATCH /api/bookings/:id/status`) is created to handle booking declination requests.
*   The endpoint performs server-side validation to ensure the booking ID is valid and the user making the request is the professional associated with the booking.
*   The booking status is successfully updated to "Declined" in the PostgreSQL database using Prisma ORM.
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 200 OK for success, 400 Bad Request for validation errors, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).

## Technical Notes
*   Define a tRPC procedure for updating booking status.
*   Utilize Zod for robust server-side schema validation.
*   Use Prisma client to interact with the PostgreSQL database for updating the `status` field of the `Booking` record.
*   Ensure proper error handling and logging for debugging.
