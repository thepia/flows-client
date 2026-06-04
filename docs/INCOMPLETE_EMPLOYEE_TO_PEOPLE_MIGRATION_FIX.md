# Incomplete Employee to People Migration Fix

## Problem Summary

The database migration from `employees` to `people` tables (migration `13_employee_to_people_migration.sql`) was incomplete. While the main `employees` and `employee_enrollments` tables were successfully migrated to `people` and `people_enrollments`, the related `documents` and `tasks` tables were not properly updated.

## Issues Identified

### 1. Column Names Still Reference `employee_id`
- ❌ `api.documents.employee_id` should be `person_id`
- ❌ `api.tasks.employee_id` should be `person_id`

### 2. Foreign Key Constraints Point to Wrong Table
- ❌ `documents.employee_id` references `employees(id)` (table no longer exists)
- ❌ `tasks.employee_id` references `employees(id)` (table no longer exists)
- ✅ Should reference `people(id)` instead

### 3. Functions Still Use `employee_id`
- ❌ `update_completion_percentage()` function references `employee_id`
- ❌ `get_person_with_enrollment()` function has mixed references

### 4. Missing RLS Policies
- ❌ `documents` and `tasks` tables lack proper RLS policies for the new schema
- ❌ Tables are not exposed through PostgREST API

### 5. Indexes Need Updates
- ❌ Index names still reference `employee_id`
- ❌ Performance could be impacted

## Root Cause Analysis

The original migration script (`13_employee_to_people_migration.sql`) attempted to update the `documents` and `tasks` tables with these statements:

```sql
-- Lines 174-182 in the migration
UPDATE api.documents 
SET employee_id = (SELECT id FROM api.people WHERE people.id = documents.employee_id)
WHERE EXISTS (SELECT 1 FROM api.people WHERE people.id = documents.employee_id);

UPDATE api.tasks
SET employee_id = (SELECT id FROM api.people WHERE people.id = tasks.employee_id)
WHERE EXISTS (SELECT 1 FROM api.people WHERE people.id = tasks.employee_id);
```

**Problem**: These UPDATE statements don't actually change anything since they're setting `employee_id` to the same value. What was needed was:
1. **ALTER TABLE ... RENAME COLUMN** to rename the columns
2. **ALTER TABLE ... DROP/ADD CONSTRAINT** to update foreign key references
3. **Update all related functions, triggers, and policies**

## Complete Fix

### Files Created:
1. **Migration SQL**: `schemas/15_complete_employee_to_people_migration_fix.sql`
2. **Application Script**: `scripts/apply-complete-people-migration-fix.cjs`
3. **Deployment Script**: `scripts/deploy-people-migration-fix.cjs`

### Changes Made:

#### 1. Column Renames
```sql
ALTER TABLE api.documents RENAME COLUMN employee_id TO person_id;
ALTER TABLE api.tasks RENAME COLUMN employee_id TO person_id;
```

#### 2. Foreign Key Constraint Updates
```sql
-- Drop old constraints
ALTER TABLE api.documents DROP CONSTRAINT documents_employee_id_fkey;
ALTER TABLE api.tasks DROP CONSTRAINT tasks_employee_id_fkey;

-- Add new constraints
ALTER TABLE api.documents ADD CONSTRAINT documents_person_id_fkey 
  FOREIGN KEY (person_id) REFERENCES api.people(id) ON DELETE CASCADE;
ALTER TABLE api.tasks ADD CONSTRAINT tasks_person_id_fkey 
  FOREIGN KEY (person_id) REFERENCES api.people(id) ON DELETE CASCADE;
```

#### 3. Function Updates
- Updated `update_completion_percentage()` to use `person_id`
- Updated `get_person_with_enrollment()` to properly reference `person_id`

#### 4. RLS Policies
- Created comprehensive RLS policies for both `documents` and `tasks` tables
- Added anonymous access for demo purposes
- Added client-specific access controls

#### 5. Index Updates
```sql
DROP INDEX idx_documents_employee_id;
CREATE INDEX idx_documents_person_id ON api.documents(person_id);

DROP INDEX idx_tasks_employee_id;
CREATE INDEX idx_tasks_person_id ON api.tasks(person_id);
```

## Deployment Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `schemas/15_complete_employee_to_people_migration_fix.sql`
5. Run the query

### Option 2: Command Line (if you have direct database access)
```bash
psql "your-connection-string" -f schemas/15_complete_employee_to_people_migration_fix.sql
```

### Option 3: Using the Scripts
```bash
# Show deployment instructions
node scripts/deploy-people-migration-fix.cjs

# Validate after deployment
node scripts/apply-complete-people-migration-fix.cjs --validate-only
```

## Validation

After applying the migration, you should see:

### ✅ Success Indicators:
- `documents` table has `person_id` column (not `employee_id`)
- `tasks` table has `person_id` column (not `employee_id`)
- Both tables are accessible through the API
- Foreign key constraints reference `people` table
- RLS policies allow proper access

### ❌ Failure Indicators:
- Tables still have `employee_id` columns
- Tables return "schema must be one of the following: api" errors
- Foreign key constraint errors when trying to insert/update

## Impact Assessment

### Before Fix:
- ❌ Documents and tasks could not be properly linked to people
- ❌ API access was broken for these tables
- ❌ Data integrity issues with orphaned references
- ❌ Frontend applications could not access documents/tasks data

### After Fix:
- ✅ Complete referential integrity between people, documents, and tasks
- ✅ Proper API access to all tables
- ✅ Consistent data model across the application
- ✅ Frontend applications can properly display and manage data

## Testing Recommendations

After deployment, test:

1. **API Access**: Verify all tables are accessible via the API
2. **Data Relationships**: Ensure documents and tasks properly link to people
3. **Frontend Integration**: Test that the demo application works correctly
4. **RLS Policies**: Verify client isolation is working properly

## Future Prevention

To prevent similar issues:
1. **Test migrations thoroughly** in development before production
2. **Use transaction blocks** for complex migrations
3. **Validate schema changes** after each migration step
4. **Include rollback procedures** for critical migrations
5. **Document breaking changes** clearly

## Files Reference

- **Migration SQL**: `/Volumes/Projects/Thepia/flows-client/schemas/15_complete_employee_to_people_migration_fix.sql`
- **Original Migration**: `/Volumes/Projects/Thepia/flows-client/schemas/13_employee_to_people_migration.sql`
- **Validation Script**: `/Volumes/Projects/Thepia/flows-client/scripts/apply-complete-people-migration-fix.cjs`
- **This Documentation**: `/Volumes/Projects/Thepia/flows-client/docs/INCOMPLETE_EMPLOYEE_TO_PEOPLE_MIGRATION_FIX.md`