# Fasberry Landing

Public-facing landing page and information hub for the Fasberry Minecraft ecosystem. A high-performance React + TypeScript application using Vike for server-side rendering, optimized for SEO and fast content delivery.

## Overview

The landing page provides:
- Public information about Fasberry
- Modpack information and download links
- Server status display
- Wiki and documentation
- Gallery of screenshots
- Support and contact information
- Project rules and information
- Game statistics and news

## Tech Stack

- **Frontend Framework**: React 19.1.0
- **Meta-framework**: Vike 0.4.246 (SSR framework)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Deployment**: Vercel
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Tabley Icons, Lucide React
- **Analytics**: Vercel Analytics & Speed Insights
- **Runtime**: Bun (development), Node.js (production)

## Requirements

- **Bun** ≥ 1.2.0 (development)
- **Node.js** ≥ 22
- **Git** ≥ 2.40

## Installation

### From Root Directory

```bash
# Install all dependencies
bun install
```

### From Landing Directory

```bash
cd apps/landing
bun install
```

## Environment Setup

Environment variables are managed per deployment stage:

### Development (`.env.development`)

```env
PUBLIC_ENV__API_URL=http://127.0.0.1:4104
VITE_VOLUME_URL=http://127.0.0.1:9000
```

### Production (`.env.production`)

```env
PUBLIC_ENV__API_URL=https://api.fasberry.fun
VITE_VOLUME_URL=https://volume.fasberry.fun
```

The landing page runs on port **3005** by default in development.

## Getting Started

### Start Development Server

```bash
# From root
bun dev

# From landing directory
bun run dev
```

The application will be available at `http://localhost:3005`.

**Features**:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- TypeScript type checking
- CSS Hot Module Replacement

### Type Checking

```bash
bun run type-check
```

### Linting

```bash
bun run lint
```

## Building

### Development Build

```bash
bun run build
```

Compiles for development environment.

### Production Build for Vercel

```bash
bun run build
```

Optimized build for Vercel deployment:
- Tree-shaking and minification
- Code splitting
- Static prerendering where applicable
- Asset optimization

**Output**: `.vercel/output/` directory compatible with Vercel's build output format.

## Deployment

### Vercel Deployment

The landing page is optimized for Vercel deployment with:
- Automatic deployments on push
- Preview environments
- Built-in analytics
- Edge caching

#### Deploy Command

```bash
# From root
bun landing:release

# From landing directory
bun run deploy
```

This uses Vercel CLI to deploy the prebuilt version to production.

#### First-time Setup

```bash
bun exec vercel login
bun exec vercel link
```

## Project Structure

```
apps/landing/
├── pages/              # Vike pages (file-based routing)
│   ├── index/         # Home page
│   ├── gallery/       # Screenshot gallery
│   ├── modpack/       # Modpack info & download
│   ├── wiki/          # Documentation/wiki
│   ├── rules/         # Server rules
│   ├── status/        # Server status
│   ├── support/       # Support & contact
│   ├── info/          # Project information
│   └── start/         # Getting started
├── renderer/          # Vike renderer configuration
│   ├── +Layout.tsx    # Root layout
│   ├── +Head.tsx      # Meta tags
│   ├── +onBeforeRoute.ts
│   └── +onPageTransitionStart/End.ts
├── shared/            # Shared utilities
│   ├── api/           # API client
│   ├── components/    # Reusable components
│   ├── lib/           # Utility functions
│   └── locales/       # i18n translations
├── public/            # Static assets
│   ├── robots.txt     # SEO
│   ├── sitemap.xml    # SEO
│   ├── fonts/         # Web fonts
│   └── svgs/          # SVG assets
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
└── package.json
```

## Available Scripts

```json
{
  "dev": "NODE_ENV=development vike dev --port 3005",
  "build": "NODE_ENV=production vike build",
  "lint": "bunx biome lint",
  "type-check": "tsc --noEmit",
  "deploy": "bun run vercel deploy --prebuilt --prod"
}
```

## Key Features

### SEO Optimization
- **Server-Side Rendering** for better search engine indexing
- **Dynamic Meta Tags** via `+Head.tsx`
- **Structured Data** support
- **Sitemap** auto-generation
- **Robots.txt** configuration

### Performance
- **Code Splitting** automatic via Vike
- **Asset Optimization** via Vite
- **Image Optimization** with optimization plugins
- **Lazy Loading** for below-the-fold content

### Analytics
- **Vercel Analytics** for page performance metrics
- **Web Vitals** tracking
- **Speed Insights** for performance monitoring

### State Management
- **Reatom** for reactive state
- **Persistent Storage** for user preferences
- **URL-based state** for navigation

### Styling
- **Tailwind CSS** for utility-first styling
- **Tailwind Variants** for component variants
- **Responsive Design** patterns
- **Motion** animations

## Page Routes

| Route | Purpose |
|-------|---------|
| `/` | Home page |
| `/gallery` | Screenshot gallery |
| `/modpack` | Modpack information & downloads |
| `/wiki` | Documentation and guides |
| `/rules` | Server rules and policies |
| `/status` | Server status dashboard |
| `/support` | Support and contact |
| `/info` | Project information |
| `/start` | Getting started guide |

## Development Tips

### Local Development
```bash
# Full dev environment
bun run docker-start  # Start services
bun dev               # Start dev servers
```

### Testing Vercel Locally

```bash
# Install Vercel CLI
bun add -g vercel

# Build locally
bun run build

# Test local build
bun run vercel dev
```

### SEO Testing
- Check `<head>` output with browser DevTools
- Validate sitemap: `http://localhost:3005/sitemap.xml`
- Check robots.txt: `http://localhost:3005/robots.txt`

### Performance Profiling
- Use Vercel Analytics dashboard
- Check bundle size with `vite-bundle-analyzer`
- Use Chrome DevTools Performance tab

## Analytics

### Vercel Analytics Dashboard

Track:
- Page views and usage
- Core Web Vitals
- Browser/device usage
- Geographic distribution
- Performance metrics

Access at `vercel.com/dashboard`

## Internationalization (i18n)

Translations are in `shared/locales/`. Add new languages:

1. Create translation file: `shared/locales/[lang].json`
2. Import in component: `import { useLocale } from '@/lib/i18n'`
3. Use: `t('key.path')`

## Troubleshooting

### Port Already in Use
```bash
# Use different port
bun run dev -- --port 3006
```

### API Connection Errors
Verify backend is running:
```bash
curl http://127.0.0.1:4104/api/health
```

### Build Failures
```bash
# Clean and rebuild
rm -rf dist .vercel
bun install
bun run build
```

### Type Errors
```bash
bun run type-check
```

### Vercel Deployment Issues

Check Vercel build logs:
```bash
bun exec vercel logs
```

Re-deploy:
```bash
bun run deploy
```

## Environment Variables

### Runtime Variables (Vercel)

Public variables available in browser:
- `PUBLIC_ENV__API_URL` - Backend API endpoint
- `VITE_VOLUME_URL` - File storage endpoint

Build-time variables:
- `VITE_*` - Available during build

## Static Generation

Pages are optimized for Vercel's Static Site Generation:
- Dynamic routes with fallback
- Incremental Static Regeneration (ISR)
- On-demand ISR updates

## Additional Resources

- [Vike Documentation](https://vike.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Guide](https://vitejs.dev/)
- [Reatom](https://reatom.dev/)

## Contributing

Follow TypeScript and linting standards. Before committing:
```bash
bun run type-check
bun run lint
```

## License

MIT
