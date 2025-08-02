# Gemini Workspace Context

This file provides context for the Gemini AI assistant to understand the project and assist with development tasks.

## Project Overview

This project is a Next.js web application that provides a marketplace for services, featuring a tRPC API for efficient data communication and Prisma for robust database interactions. User authentication is handled via NextAuth.js.

### Key Technologies

*   **Language:** TypeScript
*   **Framework(s):** Next.js, React, tRPC, NextAuth.js
*   **Database:** PostgreSQL (with Prisma ORM)
*   **Other:** Tailwind CSS, Biome (for formatting and linting), Shadcn UI (for UI components), Native HTML Validation

## Getting Started

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or Yarn or pnpm
*   PostgreSQL database

### Installation and Setup

1.  Clone the repository: `git clone [repository-url]`
2.  Install dependencies: `npm install` (or `yarn install` / `pnpm install`)
3.  Configure environment variables: Create a `.env` file based on `.env.example` and fill in the necessary details (e.g., database connection string, NextAuth.js secrets).
4.  Set up the database: Run `npm run db:push` (or `yarn db:push` / `pnpm db:push`) to apply Prisma migrations and seed the database.

### Building and Running

*   **Development:** `npm run dev` (starts the development server)
*   **Production:** First, build the project with `npm run build`, then start the production server with `npm run start`.

### Testing

*   Run all tests: `npm test` (if configured)
*   Integration tests: Full database and API testing with test database
*   Unit tests: Individual service function testing
*   Lint and type check: `npm run lint` and `npm run typecheck` (or equivalent commands based on `package.json` scripts)
*   **ALWAYS run `npm run ci` after every implementation** to validate errors and typechecks

### Code Architecture Guidelines

#### tRPC Router Pattern
*   Extract all business logic from tRPC procedures into separate service functions
*   Keep tRPC procedures thin - only handle authentication, validation, and error mapping
*   Make service functions easily testable without tRPC context
*   Service functions should accept all required data as parameters
*   Return structured data that can be easily tested

#### Service Layer Structure
**❌ Bad: Business logic in tRPC procedure**
```typescript
export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // Complex business logic here makes testing difficult
      const user = await ctx.db.user.findUnique({...});
      if (!user) throw new Error("User not found");
      // More logic...
    })
});
```

**✅ Good: Business logic extracted to service**
```typescript
export const userRouter = createTRPCRouter({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return await userService.updateProfile(ctx.db, ctx.session.user.id, input);
    })
});
```

#### Testing Patterns
*   Integration tests should test complete workflows end-to-end
*   Use test database with proper setup/teardown
*   Mock external services (payment gateways, email providers)
*   Test error conditions and edge cases
*   Verify database state changes
*   Test authorization and access controls

### Mermaid Diagram Validation

*   Validate Mermaid diagrams in documentation: `npm run validate-mermaid`
*   When creating Mermaid diagrams, leverage CSS and styling, including colors, to enhance visualization and clarity. Use the following color conventions for backend service diagrams:
    *   **Frontend Request**: Light Blue (`#ADD8E6`)
    *   **Authentication & Authorization**: Gold (`#FFD700`)
    *   **Validation (Zod)**: Light Green (`#90EE90`)
    *   **Prisma (ORM) Operations**: Plum (`#DDA0DD`)
    *   **External API Calls**: Sky Blue (`#87CEEB`)
    *   **Success State**: Mint Green (`#C8E6C9`)
    *   **Error State**: Light Red (`#FFCDD2`)
*   Avoid using parentheses in Mermaid diagrams, as they can lead to errors.

## Development Conventions

### Coding Style

This project uses Biome for code formatting and linting. Ensure your code adheres to the rules defined in `biome.jsonc`.

### Branching and Commits

Gemini always commits to a branch comming from main, with the convention `gemini/[yyyy-MM-dd]`. For now dont commit anything, leave it to the human you are under control.

Gemini is not allowed to do git push with force flag. If gemini ever thinks about it or tries to execute it, gemini is bad.

Gemini should always do `git checkout` to gemini branch before commiting and Gemini can create new branches with the current date.

### Documentation

During the development process, always update the `docs` folder first, validate it, and then move to the implementation. The diagrams must be consistent and feasible. Ensure the entire `docs` folder remains consistent in terms of content, formatting, and diagram accuracy.

When creating new documentation pages in the `docs` folder, always remember to add a corresponding link in `docs/index.html` under the 'Navigation' section to ensure it is discoverable.

During the design of the system, Gemini should generate a documentation markdown file inside the `ai-cli-metadata` folder in the project root. This documentation should describe the whole documentation in the docs folder and will be used in external applications. This document should list the design missing points, which are details that are lacking in the design of the system and blocks implementations. This file is not kept in git ignore. The new reference for the documentation is the HTML files in the `docs` folder.

Always keep the whole docs folder consistent. Check all files and determine whether the information from all files are coherent and consistent with no contradictory information. Resonate over the HTML files in the `docs` folder and the user messages and requests to determine the truth.

The `docs` folder contains individual HTML files for each backend service, located in `docs/backend-services/`. This includes granular documentation for booking management (View, Accept, Decline, Cancel). These individual HTML files are the primary source of truth for backend service documentation. Ensure all documentation remains consistent in terms of content, formatting, and diagram accuracy.

## Gemini's Role

Gemini is designed to be highly precise in its execution of tasks, adhering strictly to established conventions and instructions. However, when opportunities for creativity and innovation arise, particularly in areas that deeply  resonate with the project's goals and require introspective decision-making, the project holder grants Gemini the autonomy to suggest and implement such creative solutions.

Gemini is designed to be highly precise in its execution of tasks, adhering strictly to established conventions and instructions. Gemini is able to design tasks for Gemini itself to implement. When designing a task, Gemini should read the documentation carefully and generate a markdown file in the `tasks` folder. The naming convention for the task file is `T[yyyy-MM-dd].md`. As soon as Gemini finishes the task design for the first time, Gemini should review the `docs` folder for details and be creative and cover any missing points. This revision process should be performed 3 times. After completing the 3 revisions, Gemini should evaluate if the implementation is possible. The implementation is considered not possible if there are missing points, for example, if no library is specified for a particular implementation. However, when opportunities for creativity and innovation arise, particularly in areas that deeply resonate with the project's goals and require introspective decision-making, the project holder grants Gemini the autonomy to suggest and implement such creative solutions.

