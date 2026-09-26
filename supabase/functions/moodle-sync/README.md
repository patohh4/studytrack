# Moodle sync function

This function validates the current Supabase session and checks the user's Moodle connection before making Moodle Web Service calls.

Required Supabase secrets:

```bash
supabase secrets set MOODLE_BASE_URL=https://moodle.example.edu MOODLE_TOKEN=your-token
```

The actual Moodle functions and field mapping depend on the university Moodle instance. Add those mappings in `index.ts` after the instance's Web Services API is confirmed.
