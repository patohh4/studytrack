# StudyTrack

A personal organizer for students with Moodle integration. It brings tasks, a calendar and courses into one place and automatically pulls data from Moodle.

**Stack:** React 19, Vite, Tailwind CSS, Supabase (Google auth, database, Edge Functions), Chrome extension for Moodle.

## Getting started

```bash
cd frontend
cp .env.example .env   # fill in your Supabase credentials
npm install
npm run dev
```

## Scripts

| Command                           | Description                                 |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | start the dev server                        |
| `npm run build`                   | production build                            |
| `npm run lint`                    | run ESLint                                  |
| `npm run format` / `format:check` | format / check formatting with Prettier     |
| `npm run test:unit`               | component tests (Cypress)                   |
| `npm run test:e2e`                | e2e tests (Cypress), requires `npm run dev` |
| `npm run cy:open`                 | interactive Cypress runner                  |

## Code quality

- **ESLint** + **Prettier** (`eslint-config-prettier` disables conflicting rules)
- **Git hooks:** husky + lint-staged. Before every commit, `eslint --fix` and `prettier --write` run on staged files; a commit with ESLint errors is blocked
- **Tests:** Cypress, component tests (`src/**/*.cy.jsx`) and e2e tests (`cypress/e2e`)

## Connecting Moodle

In Moodle you need to:

1. Enable Web Services.
2. Enable the REST protocol.
3. Create a service with these functions:
   - `core_webservice_get_site_info`
   - `core_enrol_get_users_courses`
   - `mod_assign_get_assignments`
   - `core_calendar_get_action_events_by_timesort`
   - `core_course_get_enrolled_courses_by_timeline_classification`
   - `gradereport_overview_get_course_grades`
4. Create a personal token for your Moodle user.
5. In StudyTrack, open **Courses → Connect Moodle**.
6. Enter your Moodle URL and the token.

Supabase setup is described in `supabase/README.md`. The Moodle token must never be put in `.env` or committed to the repository.
