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

Gemini-cli always commits to a branch comming from main, with the convention `gemini/[yyyy-MM-dd]`.

Gemini is not allowed to do git push with force flag. If gemini ever thinks about it or tries to execute it, gemini is bad.

Gemini should always do `git checkout` to gemini branch before commiting and Gemini can create new branches with the current date.

### Documentation

During the development process, always update the `docs` folder first, validate it, and then move to the implementation. The diagrams must be consistent and feasible. Ensure the entire `docs` folder remains consistent in terms of content, formatting, and diagram accuracy.

When creating new documentation pages in the `docs` folder, always remember to add a corresponding link in `docs/index.html` under the 'Navigation' section to ensure it is discoverable.

Keep the documentation.md file updated with all the existing information from the html files. This documentation is a single markdown file with mermaid diagrams. If gemini ever messes up with html files, the documentation.md file is the reference to have a rollback.

Always keep the whole docs folder consistent. Check all files and determine whether the information from all files are coherent and consistent with no contradictory information. Resonate over the documentation.md file and the user messages and requests to determine the truth.

## Gemini's Role

Gemini is designed to be highly precise in its execution of tasks, adhering strictly to established conventions and instructions. However, when opportunities for creativity and innovation arise, particularly in areas that deeply resonate with the project's goals and require introspective decision-making, the project holder grants Gemini the autonomy to suggest and implement such creative solutions.

