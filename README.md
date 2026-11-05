# QuestOmni

Artemis Web SDK chat for the **Quest Results IVR - Text Link** project (React + Vite, `@koreai/artemis-web-sdk`).

Live site: <https://nagabhadramch.github.io/QuestOmni/>

## Two ways in

| How the page is opened | What happens |
|---|---|
| **Texted link** from a Quest voice call: `.../QuestOmni/#f=account&bt=<token>` | A full-page **secure chat** starts with the single-use, server-minted verified token (hosted exchange on the OmniWebSDK channel). The Quest agent asks for the one value it needs, saves it for the call, and the caller says *done* on the call. |
| **Plain visit** | A normal chat bubble on the OmniWebSDK channel using the public key. |

The token is read once and removed from the address bar right away. It works once, for 5 minutes.

## Settings (src/config.js)

| Setting | Value |
|---|---|
| Endpoint | `https://agents.kore.ai` |
| Project | `01a1ab58-3e51-7b07-a103-84ebb7bc80a1` |
| Web SDK channel (OmniWebSDK) | `01a1abed-037d-78e4-8ea0-4174cf59ef2a` |
| Public key | `VITE_AGENT_PUBLIC_API_KEY` (env only, never committed) |

## Run locally

```bash
npm install
cp .env.example .env.local   # then paste the full pk_abbf7afb... key
npm run dev
```

Note: the SDK key only allows the origin `https://nagabhadramch.github.io`, so a local run at `localhost` is refused unless you add `http://localhost:5173` to the key's allowed origins in Studio.

## Deploy (GitHub Pages)

1. Repository **Settings > Pages > Build and deployment > Source: GitHub Actions**.
2. Repository **Settings > Secrets and variables > Actions > New repository secret**: `VITE_AGENT_PUBLIC_API_KEY` = the full public key.
3. Push to `main` (or run the workflow by hand). The workflow `.github/workflows/pages.yml` builds and publishes `dist`.
