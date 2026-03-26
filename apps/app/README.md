# Fasberry App

Main user-facing frontend application for the Fasberry Minecraft ecosystem. A full-featured React+ TypeScript application powered by Vike (meta-framework) with server-side rendering capabilities.

## Overview

The app provides an interactive interface for Minecraft server management, including:
- User authentication and profile management
- Server control and monitoring dashboard
- Land and world management
- Player ratings and leaderboards
- Store integration
- Task management
- News and announcements
- Settings and preferences

## Tech Stack

- **Frontend Framework**: React 19.1.0
- **Meta-framework**: Vike 0.4.246 (SSR/SPA framework)
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Reatom
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Tabler Icons, Lucide React
- **Editor**: TipTap (rich text editor)
- **Runtime**: Bun

## Requirements

- **Bun** ≥ 1.2.0
- **Node.js** ≥ 22
- **Git** ≥ 2.40

## Installation

### From Root Directory

```bash
# Install all dependencies
bun install
```

### From App Directory

```bash
cd apps/app
bun install
```

## Getting Started

### Environment Setup

The app uses environment variables for configuration. Default development values:
- **API URL**: `http://127.0.0.1:4104` (backend)
- **Volume URL**: `http://127.0.0.1:9000` (MinIO storage)
- **App Port**: Configurable via `VITE_APP_PORT` (default: 3000)

Create a `.env.local` file if needed:
```env
VITE_APP_PORT=3000
VITE_APP_HOST=localhost
```

## Development

### Start Development Server

```bash
# From root
bun dev

# From app directory
bun run dev
```

The application will be available at `http://localhost:3000` (or configured port).

**Features**:
- Hot Module Replacement (HMR) for instant updates
- Fast refresh for React components
- TypeScript type checking on save
- Vike's development optimizations

### Type Checking

```bash
bun run type-check
```

Validates TypeScript without emitting code.

### Linting

```bash
bun run lint
```

Uses Biome for code linting and formatting checks.

## Building

### Development Build

```bash
bun run build
```

Compiles the application for development with source maps and optimization.

### Production Build

```bash
# From root
bun app:build

# From app directory
bun run build:prod
```

Creates an optimized production bundle with:
- Tree-shaking and minification
- Code splitting
- Asset optimization
- No source maps

**Output**: `./dist/` directory containing:
- `server/index.mjs` - Server entry point
- `client/` - Client assets

### Running Production Build

```bash
bun run start
```

Starts the production server with `NODE_ENV=production`.

## Docker

Build and deploy using Docker:

```bash
# Build Docker image
make build

# Tag for registry
make tag

# Push to registry
make push

# All steps
make release
```

**Configuration**: Requires environment variables in `../../.env`:
- `REGISTRY_HOST` - Docker registry host
- `REGISTRY_PROJECT` - Project namespace
- `REGISTRY_APP_IMAGE` - Image name

## Project Structure

```
apps/app/
├── pages/              # Vike pages (file-based routing)
│   ├── index/         # Home page
│   ├── auth/          # Authentication pages
│   ├── player/        # Player profiles
│   ├── lands/         # Land management
│   ├── map/           # World map
│   ├── store/         # Store frontend
│   ├── settings/      # User settings
│   └── ...
├── renderer/          # Vike renderer configuration
│   ├── +Layout.tsx    # Root layout
│   ├── +Head.tsx      # Meta tags
│   ├── +onBeforeRoute.ts
│   └── +client.ts
├── server/            # Server entry point
├── shared/            # Shared utilities and components
│   ├── api/           # API client
│   ├── components/    # Reusable React components
│   ├── lib/           # Utility functions
│   └── locales/       # i18n translations
├── public/            # Static assets
│   ├── robots.txt
│   ├── sitemap.xml
│   └── legal/
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
└── package.json
```

## Available Scripts

```json
{
  "dev": "bun run vike dev",                    // Development server
  "build": "NODE_ENV=production vike build",    // Build for production
  "start": "NODE_ENV=production node ./dist/server/index.mjs",  // Run prod build
  "lint": "bunx biome lint",                    // Lint code
  "type-check": "tsc --noEmit",                 // TypeScript check
  "build:prod": "make build",                   // Docker build
  "release": "make build && make tag && make push"  // Full release
}
```

## Key Features

### State Management
- Uses **Reatom** for reactive state management
- Persistent storage with `@reatom/persist`
- URL-based routing with `@reatom/url`
- Async operations with `@reatom/async`

### Styling
- **Tailwind CSS** for utility-first styling
- **Tailwind Variants** for component variants
- Responsive design patterns
- Animation support with Motion

### Rich Editor
- **TipTap**: Rich text editing with collaborative features
- Support for tables, images, text styling
- HTML input/output

### Routing
- **Vike** file-based routing system
- Server-side rendering with hydration
- Dynamic routes support

## Development Tips

### Hot Module Replacement
Changes to React components automatically refresh without full reload. CSS changes are applied instantly.

### Debugging
- Use React DevTools browser extension
- Check browser console for runtime errors
- Use VS Code debugger with Vite config

### Performance
- Tree-shakeable exports from shared libraries
- Code splitting via Vike automatic optimization
- Bundle analyzer available (set `enabled: true` in vite config)

### Database & API
- API calls through shared client in `shared/api/`
- All API endpoints defined in backend (`apps/backend/`)
- Authentication handled via session cookies

## Troubleshooting

### Port Already in Use
```bash
# Change port
VITE_APP_PORT=3001 bun run dev
```

### API Connection Errors
Verify backend is running on `http://127.0.0.1:4104` in development.

### Build Failures
```bash
# Clean and rebuild
rm -rf dist node_modules
bun install
bun run build
```

### Type Errors
```bash
bun run type-check
```

## Additional Resources

- [Vike Documentation](https://vike.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Reatom](https://reatom.dev/)
- [Vite Guide](https://vitejs.dev/)

## Contributing

Follow the project's TypeScript and linting standards. Run `bun run lint` and `bun run type-check` before committing.

## License

MIT
