# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTU GAENG Calendar Migration - A Next.js calendar/duty schedule synchronization tool with Korean language interface. Deployed at calendar.ttu.world via GitHub Pages.

## Build and Development Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Build static site (exports to /out directory)
npm run lint     # Run ESLint with Next.js core-web-vitals rules
```

## Architecture

- **Framework:** Next.js 14 with App Router, static export mode (`output: 'export'`)
- **Styling:** Tailwind CSS with Pretendard Variable font (Korean support)
- **TypeScript:** Strict mode enabled, path alias `@/*` maps to root

### Key Files

- `app/page.tsx` - Main page component (client-side)
- `app/components/calendar.tsx` - Calendar form component handling duty schedule sync
- `app/layout.tsx` - Root layout with metadata and font configuration
- `.github/workflows/nextjs.yml` - GitHub Actions workflow for Pages deployment

### API Integration

The calendar component posts to an AWS API Gateway endpoint:
- Endpoint: `https://9e240d7v0k.execute-api.ap-northeast-2.amazonaws.com/api/ttu_gaeng/duty`
- Payload: `{ year, month, website }`

## Deployment

Static export to GitHub Pages via GitHub Actions. Pushes to main trigger automatic deployment. The CNAME file configures the custom domain.

## Notes

- No testing framework is currently configured
- Node.js 20 is used in CI/CD (GitHub Actions)
