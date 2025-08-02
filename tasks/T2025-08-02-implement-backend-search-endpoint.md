# Task: Implement backend endpoint for handling search queries

## Description
Implement the backend API endpoint responsible for handling search queries from the frontend. This endpoint will receive the search query, generate a vector embedding for it, perform a semantic search using `pgvector`, and return a ranked list of matching services.

## Acceptance Criteria
*   A new API endpoint (e.g., `GET /api/search?query=...`) is created to handle search requests.
*   The endpoint receives a search query string as a parameter.
*   The backend integrates with an embedding model to generate a vector embedding for the search query.
*   A semantic search is performed against the service embeddings stored in the PostgreSQL database using `pgvector`.
*   A ranked list of relevant services is returned based on the similarity of their embeddings to the query embedding.
*   Appropriate HTTP status codes and error messages are returned for different scenarios (e.g., 200 OK for success, 400 Bad Request for invalid queries, 500 Internal Server Error for unexpected issues).

## Technical Notes
*   Define a tRPC procedure for handling search queries.
*   Utilize Zod for robust server-side schema validation of the search query parameter.
*   Integrate with the embedding model to generate query embeddings.
*   Use Prisma client and `pgvector` functions to perform the vector similarity search.
*   Consider indexing strategies for `pgvector` to optimize search performance.
*   Implement pagination for search results if necessary.
