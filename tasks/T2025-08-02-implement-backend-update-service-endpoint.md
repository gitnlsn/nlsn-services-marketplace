# Task: Implement backend endpoint for updating service listings

## Description
Implement the backend API endpoint responsible for receiving and processing updates to existing service listings. This endpoint will handle data validation and update the service details in the database, including regenerating vector embeddings if the description changes.

## Acceptance Criteria
*   A new API endpoint (e.g., `PUT /api/services/:id` or `PATCH /api/services/:id`) is created to handle service update requests.
*   The endpoint performs server-side validation of incoming service data (title, description, pricing, categories, tags).
*   If the service description is modified, the backend integrates with an embedding model to regenerate the vector embedding.
*   The updated service details, including the potentially new vector embedding, are successfully stored in the PostgreSQL database using Prisma ORM.
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 200 OK for success, 400 Bad Request for validation errors, 404 Not Found if service does not exist, 500 Internal Server Error for unexpected issues).

## Technical Notes
*   Define a tRPC procedure for service updates.
*   Utilize Zod for robust server-side schema validation of the incoming request body.
*   Implement logic to check if the description has changed before regenerating the embedding to optimize performance.
*   Use Prisma client to interact with the PostgreSQL database for updating `Service` records.
*   Ensure proper error handling and logging for debugging.
