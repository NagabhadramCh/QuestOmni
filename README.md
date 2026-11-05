# QuestOmni

Artemis Web SDK chat for the **Quest Results IVR - Text Link** project (React + Vite, `@koreai/artemis-web-sdk`).

Live site: <https://nagabhadramch.github.io/QuestOmni/>

## Two ways in

| How the page is opened | What happens |
|---|---|
| **Texted link** from a Quest voice call: `.../QuestOmni/#f=account&bt=<token>` | A full-page **secure chat** starts with the single-use, server-minted verified token (hosted exchange on the OmniWebSDK channel). The Quest agent asks for the one value it needs, saves it for the call, and the caller says *done* on the call. |
| **Plain visit** | A normal chat bubble on the OmniWebSDK channel using the public key. |

The token is read once and removed from the address bar right away. It works once, for 5 minutes.

## Settings

| Setting | Where |
|---|---|
| Endpoint, project, Web SDK channel | `src/config.js` |
| Public key `VITE_AGENT_PUBLIC_API_KEY` | `.env` (public key only, origin-restricted; never put the channel secret here) |

## Deploy (GitHub Pages, no Actions)

The built site is committed in `docs/`.

1. `npm install` (first time)
2. `npm run build` (writes `docs/`)
3. Commit and push `docs/` with your changes.
4. GitHub repository **Settings > Pages > Deploy from a branch > Branch: main, Folder: /docs**.

## Run locally

```bash
npm install
npm run dev
```

The public key only allows `https://nagabhadramch.github.io`; for `localhost` add `http://localhost:5173` to the key's allowed origins in Studio.
