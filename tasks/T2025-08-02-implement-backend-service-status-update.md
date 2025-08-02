# Task: Implement backend endpoint to update service status

## Description
Implement the backend API endpoint responsible for updating the active/inactive status of a service listing. This endpoint will receive the service ID and the new status, and update the database accordingly.

## Acceptance Criteria
*   A new API endpoint (e.g., `PUT /api/services/:id/status` or `PATCH /api/services/:id/status`) is created to handle service status update requests.
*   The endpoint performs server-side validation to ensure the service ID is valid and the new status is a boolean value.
*   The service status is successfully updated in the PostgreSQL database using Prisma ORM.
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 200 OK for success, 400 Bad Request for validation errors, 404 Not Found if service does not exist, 500 Internal Server Error for unexpected issues).

## Technical Notes
*   Define a tRPC procedure for updating service status.
*   Utilize Zod for robust server-side schema validation.
*   Use Prisma client to interact with the PostgreSQL database for updating the `active` field of the `Service` record.
*   Ensure proper error handling and logging for debugging.
