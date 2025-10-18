# Production Migration Strategy for flows-db

## Overview

This document outlines safe migration strategies for production databases with real user data.

## ⚠️ **Never Do This in Production**

```sql
-- ❌ DANGEROUS - Will lose all data
DROP TABLE api.user_roles CASCADE;
```

## ✅ **Safe Migration Strategies**

### **Strategy 1: Additive Migration (Recommended)**

**Pros**: Zero downtime, preserves all data, easy rollback
**Cons**: Temporary schema complexity

```sql
-- 1. Add new columns
ALTER TABLE api.user_roles 
ADD COLUMN client_id UUID,
ADD COLUMN employee_id UUID;

-- 2. Migrate data gradually
UPDATE api.user_roles 
SET client_id = 'some-uuid' 
WHERE role = 'client_manager';

-- 3. Add constraints after data migration
ALTER TABLE api.user_roles 
ADD CONSTRAINT role_client_consistency CHECK (...);

-- 4. Clean up old columns (optional, after validation)
-- ALTER TABLE api.user_roles DROP COLUMN old_column;
```

### **Strategy 2: Blue-Green Table Migration**

**Pros**: Clean schema, full validation before switch
**Cons**: Requires careful coordination, brief downtime

```sql
-- 1. Create new table with desired schema
CREATE TABLE api.user_roles_v2 (
  -- New enhanced schema
);

-- 2. Copy and transform data
INSERT INTO api.user_roles_v2 
SELECT 
  user_id,
  user_email,
  CASE 
    WHEN role = 'old_role' THEN 'new_role'
    ELSE role 
  END as role,
  -- Transform other columns
FROM api.user_roles;

-- 3. Validate data integrity
SELECT COUNT(*) FROM api.user_roles;
SELECT COUNT(*) FROM api.user_roles_v2;

-- 4. Switch tables (brief downtime)
BEGIN;
  ALTER TABLE api.user_roles RENAME TO user_roles_backup;
  ALTER TABLE api.user_roles_v2 RENAME TO user_roles;
COMMIT;

-- 5. Update dependent objects (views, functions, etc.)
-- 6. Test thoroughly
-- 7. Drop backup after validation period
```

### **Strategy 3: Shadow Table Migration**

**Pros**: Zero downtime, gradual migration
**Cons**: Complex dual-write logic

```sql
-- 1. Create shadow table
CREATE TABLE api.user_roles_new AS 
SELECT * FROM api.user_roles WHERE 1=0; -- Structure only

-- 2. Add enhanced columns to shadow table
ALTER TABLE api.user_roles_new ADD COLUMN client_id UUID;

-- 3. Implement dual-write in application
-- Write to both old and new tables

-- 4. Backfill shadow table
INSERT INTO api.user_roles_new 
SELECT *, NULL as client_id FROM api.user_roles;

-- 5. Switch reads to shadow table
-- 6. Stop writing to old table
-- 7. Rename tables
```

## 🔄 **Migration Checklist**

### **Pre-Migration**
- [ ] **Full database backup** with point-in-time recovery
- [ ] **Test migration** on production copy
- [ ] **Validate rollback procedure** 
- [ ] **Schedule maintenance window** (if needed)
- [ ] **Notify stakeholders** of potential impact
- [ ] **Prepare monitoring** for post-migration issues

### **During Migration**
- [ ] **Monitor database performance** 
- [ ] **Check constraint violations**
- [ ] **Validate data integrity** at each step
- [ ] **Test application functionality**
- [ ] **Monitor error logs**

### **Post-Migration**
- [ ] **Validate all data migrated correctly**
- [ ] **Test all user roles and permissions**
- [ ] **Monitor application performance**
- [ ] **Keep backup for rollback period** (7-30 days)
- [ ] **Document any issues encountered**

## 🚨 **Emergency Rollback Procedures**

### **For Additive Migrations**
```sql
-- Remove new columns if they cause issues
ALTER TABLE api.user_roles 
DROP COLUMN client_id,
DROP COLUMN employee_id;

-- Restore old constraints
ALTER TABLE api.user_roles 
ADD CONSTRAINT old_constraint_name CHECK (...);
```

### **For Blue-Green Migrations**
```sql
-- Switch back to backup table
BEGIN;
  ALTER TABLE api.user_roles RENAME TO user_roles_failed;
  ALTER TABLE api.user_roles_backup RENAME TO user_roles;
COMMIT;
```

### **Application-Level Rollback**
- **Feature flags** to disable new role system
- **Fallback to old authentication logic**
- **Revert JWT claim changes**

## 📊 **Data Validation Queries**

### **Before Migration**
```sql
-- Count users by role
SELECT role, COUNT(*) FROM api.user_roles GROUP BY role;

-- Check for orphaned references
SELECT COUNT(*) FROM api.user_roles ur 
LEFT JOIN auth.users au ON ur.user_id = au.id 
WHERE au.id IS NULL;
```

### **After Migration**
```sql
-- Validate role distribution
SELECT role, COUNT(*) FROM api.user_roles GROUP BY role;

-- Check constraint compliance
SELECT COUNT(*) FROM api.user_roles WHERE 
  (role = 'thepia_staff' AND client_id IS NOT NULL) OR
  (role = 'client_manager' AND client_id IS NULL);

-- Test RLS policies
SET ROLE authenticated;
SELECT COUNT(*) FROM api.user_roles; -- Should respect RLS
```

## 🔧 **Tools and Scripts**

### **Migration Monitoring**
```sql
-- Create migration status table
CREATE TABLE api.migration_status (
  migration_name TEXT PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'rolled_back')),
  rows_affected INTEGER,
  error_message TEXT
);
```

### **Performance Monitoring**
```sql
-- Monitor long-running queries during migration
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

## 🎯 **Best Practices**

1. **Always test on production copy first**
2. **Use transactions for atomic operations**
3. **Migrate in small batches** to avoid locks
4. **Monitor database performance** throughout
5. **Have rollback plan ready** before starting
6. **Document every step** for future reference
7. **Validate data integrity** at each checkpoint
8. **Keep stakeholders informed** of progress

## 📋 **Example Production Migration Plan**

### **Week 1: Preparation**
- Create production database copy
- Test migration scripts
- Validate rollback procedures
- Schedule maintenance window

### **Week 2: Migration**
- **Day 1**: Deploy additive schema changes
- **Day 2-3**: Migrate data in batches
- **Day 4**: Add constraints and validate
- **Day 5**: Test application functionality

### **Week 3: Validation**
- Monitor for issues
- Validate all user roles work correctly
- Performance testing
- User acceptance testing

### **Week 4: Cleanup**
- Remove old columns (if applicable)
- Drop backup tables (after validation period)
- Update documentation
- Post-mortem review

This approach ensures **zero data loss** and **minimal downtime** while providing multiple safety nets for production environments.
