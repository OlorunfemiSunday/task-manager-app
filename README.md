
# Task Manager App

Full-stack Task Manager with **session authentication**, JSON file storage, and a simple frontend.

## Features
- Signup / Login / Logout using `express-session`
- CRUD tasks with **priority** (Low/Medium/High) and color coding
- Per-user task ownership
- Frontend served by Express (same-origin cookies work out of the box)
- No database required — uses `users.json` and `tasks.json`

## Project Structure
```
task-manager-app/
  backend/
    server.js
    users.json
    tasks.json
    package.json
  frontend/
    index.html
    dashboard.html
    script.js
  .gitignore
  README.md
```

## Quick Start

1) Install dependencies
```bash
cd backend
npm install
```

2) Run the app
```bash
npm run dev
# or
npm start
```

3) Open the app in your browser:
```
http://localhost:3000/
```

## API Overview (all under same origin)

- `POST /signup` — body: `{ username, password }`
- `POST /login` — body: `{ username, password }`
- `POST /logout`
- `GET /api/tasks` — returns user's tasks
- `POST /api/tasks` — body: `{ title, description, priority }`
- `PUT /api/tasks/:id` — body: `{ title?, description?, priority?, done? }`
- `DELETE /api/tasks/:id`

### Priorities
- Low — green
- Medium — orange
- High — red

## Dependencies to Install

From `/backend` folder:

Runtime deps:
- **express**
- **express-session**
- **bcryptjs**
- **uuid**
- **morgan**
- **helmet**

Dev deps (optional for hot reload):
- **nodemon**

Install them:
```bash
npm install express express-session bcryptjs uuid morgan helmet
npm install -D nodemon
```

## Commit Message Rules (suggested)
Use conventional commits:
- `feat: add signup route`
- `fix: handle session cookie in production`
- `chore: add README`
- `refactor: split task controller`
- `style: format server.js`
- `docs: update API section`

## Notes
- This is demo-grade storage. For production, use a database.
- Session secret is hard-coded for convenience; use `.env` in real projects.
