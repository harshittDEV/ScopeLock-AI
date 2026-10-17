# ScopeLock AI

ScopeLock AI is a project exploring a simple question: **How can we let
AI agents use tools without letting the AI decide what it is allowed to
do?**

The idea is to let AI interpret a request, while the backend checks
permissions and decides whether the action can run. Approved actions can
then be recorded for review.

## What it includes

-   Dashboard for viewing activity and metrics
-   AI assistant interface
-   Policy and firewall views
-   Audit log
-   React frontend and Node.js/Express backend
-   SQLite for local development data

## How it works

1.  A user submits a request.
2.  The AI can help turn it into a structured action.
3.  The backend validates the request and checks permissions.
4.  The backend allows or denies the action based on its policy.
5.  The result is recorded for auditing.

**The AI can suggest an action, but it should never decide its own
permissions.**

## Tech stack

-   **Frontend:** React, TypeScript, Vite
-   **Backend:** Node.js, Express, TypeScript
-   **Database:** SQLite
-   **AI:** Configurable provider integration

## Run locally

You'll need Node.js and npm installed.

``` bash
git clone https://github.com/<your-username>/ScopeLock-AI.git
cd ScopeLock-AI
```

Install dependencies:

``` bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

Copy the environment template and configure it for your setup:

``` bash
cd ..
cp .env.example .env
```

Then check the `scripts` section in the root, `backend`, and `frontend`
`package.json` files and start each service using the available
development command. The backend's example port is `4000`; Vite commonly
runs on `5173`.

Keep real API keys in your local `.env` file or the backend host's
environment settings. Never commit secrets or expose AI keys in frontend
variables.

## Deployment

The frontend lives in `frontend/` and can be deployed on Vercel by
setting the **Root Directory** to `frontend`, with `dist` as the output
directory.

The backend needs its own deployment and a public API URL. Configure the
frontend to use that URL instead of `localhost`. If using SQLite in
production, make sure the hosting provider supports persistent storage.

## Security note

This is a hackathon/prototype project, not a production-ready security
product. In particular, demo identity mode is for testing only. Before
public or real-world use, review authentication, authorization checks,
database persistence, and deployment security.

## License

No license has been added yet.

------------------------------------------------------------------------

Built to explore a safer boundary between AI-generated actions and
backend-enforced permissions.
