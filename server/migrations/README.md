# Database Migrations

This directory contains SQL migration files for the Astra mental health chat application.

## Migrations

### `add-onboarding-fields.sql`

Adds enhanced onboarding fields to the `profiles` table to support the mental health-focused user onboarding process.

**Fields added:**

- `first_name` - User's first name for personalization
- `last_name` - User's last name (optional)
- `age_range` - User's age range (12-18, 19-25, 26-40, 40+)
- `current_situation` - User's current situation (school, work, both)
- `primary_concerns` - Array of mental health focus areas
- `support_goals` - Array of support goals
- `communication_style` - Preferred communication style
- `crisis_contact` - Emergency contact information
- `daily_checkins` - Whether user wants daily mood check-ins
- `anonymous_mode` - Whether user prefers anonymous mode

## How to Apply Migrations

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the migration SQL
4. Execute the migration

### Using Supabase CLI

```bash
# Apply migration using Supabase CLI
supabase db push

# Or apply specific migration
psql -h your-db-host -U your-username -d your-database -f add-onboarding-fields.sql
```

### Using psql directly

```bash
psql "postgresql://username:password@host:port/database" -f add-onboarding-fields.sql
```

## Migration Order

1. `add-onboarding-fields.sql` - Must be applied after the initial profiles table creation

## Notes

- All migrations use `IF NOT EXISTS` clauses to prevent errors on re-runs
- Constraints are added to ensure data integrity (valid age ranges and situations)
- Indexes are created for better query performance
- Comments are added for documentation purposes
