# Supabase setup

1. Create a Supabase project.
2. Run the SQL migrations in `migrations/` from the Supabase SQL Editor. If the initial schema already exists, run only `20260916000000_add_profile_fields.sql`.
3. Copy `frontend/.env.example` to `frontend/.env` and fill in the Supabase URL and anon key.
4. Enable Google in Supabase Authentication > Providers and add the OAuth client ID and secret.
5. In Moodle, enable Web services, enable the REST protocol, create a service with these functions, and create a user token:

```text
core_webservice_get_site_info
core_enrol_get_users_courses
mod_assign_get_assignments
```

6. Deploy the Moodle function with the Supabase CLI:

```bash
supabase functions deploy moodle-sync
```

7. Open StudyTrack > Courses > Connect Moodle and enter the Moodle URL and token. The app validates the connection, imports current courses and assignments, and stores them in `public.courses` and `public.tasks` with `source = 'moodle'`.

The browser may use only the anon key. The Moodle token is submitted to the authenticated Edge Function and stored in the RLS-protected `moodle_connections` row for subsequent syncs; never put it in `frontend/.env` or commit it.

When Supabase is configured, Dashboard and Courses no longer render demo records. They show an empty state until Moodle data is successfully synchronized.
