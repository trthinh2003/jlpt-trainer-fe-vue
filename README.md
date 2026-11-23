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
    catalog/         Kanji and grammar browsing, shared Excel import
    review/          Review-card API and due-card page
    dashboard/       Study progress, review activity, and quiz scores
    mock-test/       Timed vocabulary quizzes, history, and answer review
  shared/
    api/             HTTP client and error handling
    types/           Shared types and backend enums
  styles/            Global CSS
```

New features can follow the same layout under `features/<name>`, with `api/`, `pages/`, and `types.ts` as needed.

## Review study cards

Sign in, add a vocabulary, kanji, or grammar item to your review queue with **Thêm vào bộ ôn** (Add to review), then open **Ôn tập** (Review). Choose **Hiện đáp án** (Show answer) or press Space to flip the card. Rate it with the on-screen buttons or keys 1 through 4. Each round shows up to 20 due cards, tracks your progress, and ends with a summary of saved ratings and any skipped cards. The server calculates the next review time.

The vocabulary page fetches catalog permissions from `GET /api/auth/me`. **Thêm từ** (Add vocabulary) and **Xóa** (Delete) are available to catalog managers. [Manage account permissions](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.md#catalog-management).

Use **Chọn nhiều** (Select multiple) in the vocabulary, Kanji, or grammar catalog to select up to 20 items of one type across pages. Add the selection to your review queue to see how many items were added, already in your queue, or missing from the catalog.

In **Ôn tập** (Review), choose a card type or JLPT level, then select **Tải thẻ đến hạn** (Load due cards) to start a filtered round. Both filters default to **Tất cả** (All).

Vocabulary images appear after you reveal the answer. If an image fails to load, choose **Tải lại ảnh** (Reload image) or continue grading. Catalog managers can upload or remove the image from the vocabulary editor.

Open **Bài học video** (Video lessons) from the catalog navigation to browse by JLPT level and play or seek through a lesson. Catalog managers can publish and unpublish MP4 lessons from this page.

Open **Học qua audio** (Learn with audio) to listen with synchronized Japanese lyrics. Click a line to seek. Vocabulary appears when playback ends, and each word can be added to the review queue.

## Import study materials from Excel

Catalog managers can open **Nhập Excel** (Import Excel) on the vocabulary, kanji, or grammar page. Download the template, fill its first worksheet, and select an `.xlsx` file up to 5 MB. Choose **Xem trước** (Preview) to see how many rows are ready, how many are duplicates, and which Excel rows have errors. Choose **Xác nhận nhập** (Confirm import) to save valid new rows and see the actual import count. Learners can browse all three catalogs and add items to their personal review queue.

## Change or reset a password

Choose **Đổi mật khẩu** (Change password) at the top of the vocabulary page. Enter your current password, your new password, and the confirmation. After saving, sign in with the new password. Existing sessions are rejected the next time they call a protected endpoint.

If you cannot sign in, choose **Quên mật khẩu?** (Forgot password?) on the sign-in page. The backend sends a link to the account email when Gmail SMTP is configured. [Gmail setup and migrations](https://github.com/trthinh2003/jlpt-trainer-api/blob/main/README.md#password-reset-with-gmail).

## API configuration

Open **Bài luyện** (Quiz) to choose a JLPT level, take a 15-minute vocabulary quiz, review missed or skipped questions, and download the result PDF. Apply the backend migrations to enable quizzes and the **Thêm vào bộ ôn** (Add to review) action for newly issued quizzes.

Open **Tiến độ** (Progress) from the vocabulary or review page to see 84 days of UTC review activity, card mastery by type, and recent quiz scores. Run the backend's `AddReviewEvents` migration and use HTTPS for a deployed frontend so review submissions can use the browser's UUID generator.

`VITE_API_BASE_URL` defaults to `/api`. For deployment, configure a reverse proxy for `/api` or set the variable to the API URL before building. See `.env.example` for the configuration format. Keep tokens and secrets out of Vite environment variables.

The app keeps the existing `jlpt_token` and `jlpt_user` keys in localStorage. If a protected request returns `401`, the app clears the session and opens the sign-in page.
