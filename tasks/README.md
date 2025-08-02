# Task Files Naming Convention

This directory contains individual task files for the NLSN Services Marketplace project. Each task file follows a standardized naming convention to ensure consistency and easy identification.

## Naming Convention

All task files follow this format:
```
T[YYYY-MM-DD]-[category]-[layer]-[specific-task].md
```

### Components:
- **T**: Prefix indicating this is a task file
- **YYYY-MM-DD**: Creation date (e.g., 2025-08-02)
- **category**: Main feature category (e.g., auth, booking, payment)
- **layer**: Implementation layer (ui, backend, integration)
- **specific-task**: Descriptive task name using hyphens

### Categories:
- **auth**: Authentication and authorization
- **home**: Home screen and landing page
- **search**: Search functionality
- **service**: Service management and details
- **booking**: Booking management
- **payment**: Payment processing
- **dashboard**: User dashboards
- **review**: Reviews and ratings
- **profile**: User profile management

### Layers:
- **ui**: Frontend/UI components
- **backend**: Backend API endpoints
- **integration**: Third-party integrations

## Examples:
- `T2025-08-02-auth-ui-google-signin-button.md` - Frontend Google sign-in button
- `T2025-08-02-booking-backend-create-endpoint.md` - Backend endpoint for creating bookings
- `T2025-08-02-payment-backend-pagarme-integration.md` - Pagarme payment gateway integration

## Task Structure

Each task file should contain:
1. **Task Title**: Clear description of what needs to be done
2. **Description**: Detailed explanation of the task
3. **Acceptance Criteria**: Specific requirements that must be met
4. **Technical Details**: Implementation specifics, dependencies, and constraints
5. **Estimated Effort**: Size estimate (Small/Medium/Large)
6. **Dependencies**: Other tasks or systems this depends on
7. **Notes**: Additional context or considerations