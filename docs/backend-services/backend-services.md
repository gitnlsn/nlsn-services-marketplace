# Backend Service Operations

This document outlines the backend operations for each high-level user use case, using Mermaid flowcharts to visualize the process.

## Manage Profile

```mermaid
graph TD
    A[Frontend Request: Update Profile] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Input Data]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E[Call Prisma: Update User Record]
    C -- Invalid --> F[Return 400 Error: Validation Failed]
    E -- Success --> G[Return 200 OK: Profile Updated]
    E -- Failure --> H[Return 500 Error: Database Error]
```

## Search for Services

```mermaid
graph TD
    A[Frontend Request: Search Query] --> B{Validate Search Parameters}
    B -- Valid --> C[Call Prisma: Search Services (with pgvector for semantic search)]
    B -- Invalid --> D[Return 400 Error: Invalid Parameters]
    C -- Success --> E[Return 200 OK: Search Results]
    C -- Failure --> F[Return 500 Error: Database/Search Error]
```

## View Service/Portfolio

```mermaid
graph TD
    A[Frontend Request: View Service/Portfolio] --> B{Validate Service/User ID}
    B -- Valid --> C[Call Prisma: Fetch Service/User Details]
    B -- Invalid --> D[Return 400 Error: Invalid ID]
    C -- Success --> E[Return 200 OK: Service/Portfolio Details]
    C -- Failure --> F[Return 404 Error: Not Found or 500 Error: Database Error]
```

## Book a Service

```mermaid
graph TD
    A[Frontend Request: Book Service] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Booking Details]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E[Call Prisma: Create Booking Record]
    C -- Invalid --> F[Return 400 Error: Validation Failed]
    E -- Success --> G[Initiate Payment Process]
    E -- Failure --> H[Return 500 Error: Database Error]
    G -- Payment Success --> I[Return 200 OK: Booking Confirmed]
    G -- Payment Failure --> J[Return 402 Error: Payment Required]
```

## Pay for Service

```mermaid
graph TD
    A[Frontend Request: Payment Submission] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Payment Details]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E[Call Pagarme API: Process Payment]
    C -- Invalid --> F[Return 400 Error: Validation Failed]
    E -- Payment Success --> G[Call Prisma: Update Booking/Transaction Status]
    E -- Payment Failure --> H[Return 402 Error: Payment Failed]
    G -- Success --> I[Return 200 OK: Payment Confirmed]
    G -- Failure --> J[Return 500 Error: Database Error]
```

## Leave a Review

```mermaid
graph TD
    A[Frontend Request: Submit Review] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Review Data]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E[Call Prisma: Create Review Record]
    C -- Invalid --> F[Return 400 Error: Validation Failed]
    E -- Success --> G[Call Prisma: Update Service/Professional Rating (Optional)]
    E -- Failure --> H[Return 500 Error: Database Error]
    G -- Success --> I[Return 200 OK: Review Submitted]
    G -- Failure --> H
```

## Create/Edit Service Listing

```mermaid
graph TD
    A[Frontend Request: Create/Edit Service] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Service Data]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E{Check if Existing Service}
    C -- Invalid --> F[Return 400 Error: Validation Failed]
    E -- Yes --> G[Call Prisma: Update Service Record]
    E -- No --> H[Call Prisma: Create Service Record]
    G -- Success --> I[Return 200 OK: Service Updated]
    G -- Failure --> J[Return 500 Error: Database Error]
    H -- Success --> K[Return 201 Created: Service Created]
    H -- Failure --> J
```

## Upload Photos

```mermaid
graph TD
    A[Frontend Request: Upload Photo] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Image File & Metadata]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E[Upload File to Cloud Storage]
    C -- Invalid --> F[Return 400 Error: Validation Failed]
    E -- Success --> G[Call Prisma: Store Photo URL/Metadata]
    E -- Failure --> H[Return 500 Error: Cloud Storage Error]
    G -- Success --> I[Return 200 OK: Photo Uploaded]
    G -- Failure --> J[Return 500 Error: Database Error]
```

## Manage Bookings

```mermaid
graph TD
    A[Frontend Request: View/Update Booking] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Booking ID & User Permissions]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E{Action: View, Accept, Decline, Cancel}
    C -- Invalid --> F[Return 400 Error: Invalid Booking ID/Permissions]
    E -- View --> G[Call Prisma: Fetch Booking Details]
    E -- Accept/Decline/Cancel --> H[Call Prisma: Update Booking Status]
    G -- Success --> I[Return 200 OK: Booking Details]
    G -- Failure --> J[Return 404 Error: Not Found or 500 Error: Database Error]
    H -- Success --> K[Return 200 OK: Booking Status Updated]
    H -- Failure --> J
```

## View Earnings & Request Withdrawal

```mermaid
graph TD
    A[Frontend Request: View Earnings] --> B{Authentication & Authorization Check}
    B -- Success --> C[Call Prisma: Fetch User Earnings]
    B -- Failure --> D[Return 401/403 Error]
    C -- Success --> E[Return 200 OK: Earnings Data]
    C -- Failure --> F[Return 500 Error: Database Error]

    G[Frontend Request: Request Withdrawal] --> H{Authentication & Authorization Check}
    H -- Success --> I[Validate Withdrawal Request]
    H -- Failure --> D
    I -- Valid --> J[Call Pagarme API: Initiate Withdrawal]
    I -- Invalid --> K[Return 400 Error: Validation Failed]
    J -- Success --> L[Call Prisma: Update Withdrawal Status]
    J -- Failure --> M[Return 500 Error: Pagarme Error]
    L -- Success --> N[Return 200 OK: Withdrawal Initiated]
    L -- Failure --> M
```

## Manage Notification Preferences

```mermaid
graph TD
    A[Frontend Request: Update Notification Preferences] --> B{Authentication & Authorization Check}
    B -- Success --> C[Validate Preferences Data]
    B -- Failure --> D[Return 401/403 Error]
    C -- Valid --> E[Call Prisma: Update User Notification Preferences]
    C -- Invalid --> F[Return 400 Error: Validation Failed]
    E -- Success --> G[Return 200 OK: Preferences Updated]
    E -- Failure --> H[Return 500 Error: Database Error]
```
