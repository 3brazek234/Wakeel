# Wakeel Web

Frontend for Wakeel (React + Vite).

Run development:

```bash
cd wakeel-web
bun install   # or npm install
bun run dev   # or npm run dev
```

Set `VITE_API_URL` in `.env` to point at your API (default: http://localhost:3000)

Tailwind + shadcn UI (optional)
1. Install Tailwind and PostCSS:

```bash
cd wakeel-web
bun add -d tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. (Optional) Install shadcn UI and dependencies following their docs. After installing, use their component generator to scaffold components.

3. The project already includes `tailwind.config.cjs` and `postcss.config.cjs` and uses `src/index.css` with Tailwind directives.

Notes
- Ensure `VITE_API_URL` points at your API and the backend allows CORS from `http://localhost:5173`.
