# Gemini Workspace Context

This file provides context for the Gemini AI assistant to understand the project and assist with development tasks.

## Project Overview

This project is a Next.js web application that provides a marketplace for services, featuring a tRPC API for efficient data communication and Prisma for robust database interactions. User authentication is handled via NextAuth.js.

### Key Technologies

*   **Language:** TypeScript
*   **Framework(s):** Next.js, React, tRPC, NextAuth.js
*   **Database:** PostgreSQL (with Prisma ORM)
*   **Other:** Tailwind CSS, Biome (for formatting and linting)

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
*   Lint and type check: `npm run lint` and `npm run typecheck` (or equivalent commands based on `package.json` scripts).

### Mermaid Diagram Validation

*   Validate Mermaid diagrams in documentation: `npm run validate-mermaid`

## Development Conventions

### Coding Style

This project uses Biome for code formatting and linting. Ensure your code adheres to the rules defined in `biome.jsonc`.

### Branching and Commits

Gemini-cli always commits to a branch comming from main, with the convention pr/[name-of-the-feature]

### Documentation

During the development process, always update the `docs` folder first, validate it, and then move to the implementation. The diagrams must be consistent and feasible. Ensure the entire `docs` folder remains consistent in terms of content, formatting, and diagram accuracy.

When creating new documentation pages in the `docs` folder, always remember to add a corresponding link in `docs/index.html` under the 'Navigation' section to ensure it is discoverable.
