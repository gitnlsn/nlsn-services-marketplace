# Task: Implement backend endpoint for creating service listings

## Description
Implement the backend API endpoint responsible for receiving and processing new service listing data from the frontend. This endpoint will handle data validation, generate vector embeddings, and store the service details in the database.

## Acceptance Criteria
*   A new API endpoint (e.g., `POST /api/services`) is created to handle service creation requests.
*   The endpoint performs server-side validation of incoming service data (title, description, pricing, categories, tags).
*   Upon successful validation, the backend integrates with an embedding model to generate a vector embedding from the service description.
*   The service details, including the generated vector embedding, are successfully stored in the PostgreSQL database using Prisma ORM.
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 201 Created for success, 400 Bad Request for validation errors, 500 Internal Server Error for unexpected issues).

## Technical Notes
*   Define a tRPC procedure for service creation.
*   Utilize Zod for robust server-side schema validation of the incoming request body.
*   Integrate with the embedding model (e.g., a separate service or library) to generate embeddings.
*   Use Prisma client to interact with the PostgreSQL database for creating new `Service` records.
*   Ensure proper error handling and logging for debugging.
