# Task: Implement backend endpoint to fetch booking details for both roles

## Description
Implement the backend API endpoint(s) responsible for fetching booking details for both customers and professionals. This endpoint should return relevant booking information based on the user's role and permissions.

## Acceptance Criteria
*   A secure API endpoint (e.g., `GET /api/bookings` or `GET /api/bookings/:id`) is created to retrieve booking information.
*   The endpoint correctly identifies the user's role (customer or professional) based on authentication.
*   For customers, the endpoint returns only bookings made by them.
*   For professionals, the endpoint returns only bookings received by them.
*   The endpoint returns comprehensive booking details, including service information, client/professional details, dates, times, status, and payment status.
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 200 OK for success, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).

## Technical Notes
*   Define tRPC procedures for fetching bookings, potentially with input validation for filters (e.g., booking ID, status).
*   Implement Prisma queries to retrieve booking data, ensuring proper filtering based on user ID and role.
*   Consider pagination and sorting for large datasets.
*   Ensure sensitive information (e.g., full payment details) is not exposed to unauthorized users.
