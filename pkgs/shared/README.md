# @repo/shared

Common utilities, shared constants, TypeScript models, validation schemas, and build/formatting scripts utilized across both applications and other packages.

## Structure

- **`constants`**: Platform-wide configuration flags, logging patterns, and constants.
- **`schemas` / `types`**: Shared Zod schemas and TypeScript typings.
- **`utils`**: General helpers (including build bundle info analyzers).

## Key Libraries Used

- **Validation**: `zod` (Shared application schemas)
- **Database Types**: `kysely` (Integrated SQL definitions and type codegen helper)
- **CSS Class Helpers**: `clsx` + `tailwind-merge` (Styling / design utility helpers)
