# Copilot Instructions for Homestay Backend

## Project Overview
- This is a Node.js backend for a homestay booking platform, using Express, Knex (MySQL), and a modular service/controller architecture.
- The codebase is organized by feature: each domain (user, homestay, booking, etc.) has its own controller, service, and route files under `src/`.
- Data access is via Knex, configured in `src/database/knex.js` (uses environment variables from `.env`).
- All API responses use a custom JSend-style format (`src/jsend.js`).
- Error handling is standardized via `ApiError` (`src/api-error.js`).

## Key Patterns & Conventions
- **Session-based auth**: User/session info is attached to `req.session` (see `middlewares/session.js`).
- **Role-based access**: Use `requireLogin` and `requireRole` middlewares to protect routes. Role IDs: 1=Admin, 2=Owner, 3=Customer.
- **Controllers**: Only handle HTTP logic and call corresponding service methods. All business logic and DB access is in `src/services/`.
- **Services**: Throw `ApiError` for all error cases. Never return raw DB errors.
- **Routes**: Grouped by resource in `src/routes/`. Each route imports its controller and relevant middlewares.
- **Image upload**: Handled via `multer` in `middlewares/imageUpload.js`, storing files in `public/uploads/`.
- **Password policy**: Passwords are stored as plain text (max 10 chars, per requirements). No hashing.
- **Database**: Table names are UPPERCASE. Foreign keys use `_ID` suffix. See service files for join/query patterns.

## Developer Workflows
- **Start server**: `npm start` (runs `nodemon server.js`).
- **Environment**: Set DB and port in `.env` (see sample in repo).
- **DB connection**: Configured in `knexfile.js` and `src/database/knex.js`.
- **Testing**: No automated tests present; test via API calls (e.g., Postman).
- **Debugging**: Use `console.log` for debugging. All errors are returned in JSend format.

## Integration Points
- **External dependencies**: Express, Knex, MySQL, Multer, Dayjs, dotenv, cors, express-session.
- **Static files**: Served from `/uploads` (maps to `public/uploads/`).
- **API endpoints**: All under `/api/` prefix (see `src/app.js`).

## Examples
- To add a new resource, create `service`, `controller`, and `route` files in `src/`, following the existing pattern.
- To add a protected route: use `requireLogin` and/or `requireRole` in the route definition.
- To add a DB query: use Knex in the service file, never in controllers or routes.

## References
- Main entry: `server.js` → `src/app.js`
- Example: `src/services/homestay.service.js`, `src/controllers/homestay.controller.js`, `src/routes/homestay.route.js`
- Error handling: `src/api-error.js`, `src/jsend.js`
- Auth/session: `src/middlewares/session.js`, `src/middlewares/requireLogin.js`, `src/middlewares/requireRole.js`

---
For questions or unclear patterns, review the referenced files or ask for clarification.
