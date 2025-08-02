# Task: Develop frontend form for creating new service listings

## Description
Develop the frontend form that allows professionals to create new service listings. This form should capture essential details such as title, description, pricing, categories, and tags.

## Acceptance Criteria
*   A dedicated frontend page/component for creating new service listings exists.
*   The form includes input fields for:
    *   Service Title (text input)
    *   Service Description (textarea)
    *   Pricing (number input, with options for fixed, hourly, or custom quote)
    *   Categories (multi-select or dropdown, pre-defined list)
    *   Tags (text input with auto-completion or multi-select)
*   The form utilizes Shadcn UI components for a consistent look and feel.
*   Native HTML validation is implemented for all form fields (e.g., `required`, `minlength`, `maxlength`, `type`).
*   The form is responsive and user-friendly across different screen sizes.

## Technical Notes
*   Utilize React components for form structure and state management.
*   Integrate Shadcn UI form components (e.g., `Input`, `Textarea`, `Select`, `MultiSelect`).
*   Implement client-side validation using native HTML attributes.
*   Consider how categories and tags will be fetched from the backend (if dynamic).
