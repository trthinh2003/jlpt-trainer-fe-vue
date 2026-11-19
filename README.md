# JLPT Trainer Frontend

**English** | [日本語](README.ja.md) | [Tiếng Việt](README.vi.md)

The JLPT Trainer learning interface, built with Vue 3, the Composition API, TypeScript, and Vite. The app uses the companion [ASP.NET Core backend](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.md).

## Run locally

The frontend requires Node.js 20.19+ or 22.12+. The API requires the .NET SDK specified in its README.

1. Use a separate terminal for the API. Set up PostgreSQL and JWT, apply the database migrations, and start the API with the HTTPS profile on port `7017`. The `cd` command assumes the backend is at `Project3/backend` and this repository is at `Project3/frontend/jlpt-trainer-fe-vue`. [Backend setup](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.md#run-locally).

   ```powershell
   cd ..\..\backend
   dotnet run --project src\JlptTrainer.Api --launch-profile https
   ```

2. In the frontend directory, install dependencies and start Vite.

   ```powershell
   npm ci
   npm run dev
   ```

Open `http://localhost:5173`. Vite proxies `/api` to `https://localhost:7017`, so the local Vue app can use the API with its existing CORS settings.

## Commands

- `npm run dev` starts the development server.
- `npm run typecheck` checks TypeScript and Vue single-file components.
- `npm test` runs the HTTP client regression tests.
- `npm run build` checks types and writes the production build to `dist/`.
- `npm run preview` serves the production build locally.

## Source layout

```text
src/
  app/              App and router
  features/
    auth/            Auth API, session state, and account pages
    vocab/           Vocabulary API, types, and catalog page
    review/          Review-card API and due-card page
  shared/
    api/             HTTP client and error handling
    types/           Shared types and backend enums
  styles/            Global CSS
```

New features can follow the same layout under `features/<name>`, with `api/`, `pages/`, and `types.ts` as needed.

## Review study cards

Sign in, choose **Thêm vào bộ ôn** (Add to review) on a vocabulary item, then open **Ôn tập** (Review). Choose **Hiện đáp án** (Show answer) and rate how well you remembered the card. The server calculates the next review time. Each batch shows up to 20 due vocabulary, kanji, or grammar cards from your review queue.

The vocabulary page fetches catalog permissions from `GET /api/auth/me`. **Thêm từ** (Add vocabulary) and **Xóa** (Delete) are available to catalog managers. [Manage account permissions](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.md#catalog-management).

## Change or reset a password

Choose **Đổi mật khẩu** (Change password) at the top of the vocabulary page. Enter your current password, your new password, and the confirmation. After saving, sign in with the new password. Existing sessions are rejected the next time they call a protected endpoint.

If you cannot sign in, choose **Quên mật khẩu?** (Forgot password?) on the sign-in page. The backend sends a link to the account email when Gmail SMTP is configured. [Gmail setup and migrations](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.md#password-reset-with-gmail).

## API configuration

`VITE_API_BASE_URL` defaults to `/api`. For deployment, configure a reverse proxy for `/api` or set the variable to the API URL before building. See `.env.example` for the configuration format. Keep tokens and secrets out of Vite environment variables.

The app keeps the existing `jlpt_token` and `jlpt_user` keys in localStorage. If a protected request returns `401`, the app clears the session and opens the sign-in page.
