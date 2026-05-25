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
- **Meta-framework**: >= Vike 0.4.257 (SSR framework)
- **Build Tool**: Vite
- **Language**: >= TypeScript 5.8.3
- **Deployment**: Vercel
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI, Tabley Icons, Lucide React
- **Analytics**: Vercel Analytics & Speed Insights
- **Runtime**: Bun (development), Node.js (production)

The application will be available at `http://localhost:3005`.

**Output**: `.vercel/output/` directory compatible with Vercel's build output format.

This uses Vercel CLI to deploy the prebuilt version to production.

#### First-time Setup

```bash
bun exec vercel login
bun exec vercel link
```

## Additional Resources
- [Vike Documentation](https://vike.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Guide](https://vitejs.dev/)
- [Reatom](https://reatom.dev/)