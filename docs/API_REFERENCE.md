# Flows API Reference

*Complete API documentation for Flows platform integration*

## 🔐 Authentication

All API endpoints require authentication using JWT Bearer tokens.

```bash
# Include in all requests
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Base URL**: `{SUPABASE_URL}/rest/v1/`
**Schema**: All endpoints use the `api` schema

---

## 👥 People Management

### GET /people
Retrieve people records with filtering and pagination.

```bash
# Get all people for a client
curl -X GET "{SUPABASE_URL}/rest/v1/people?client_id=eq.{client_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"

# Filter by employment status
curl -X GET "{SUPABASE_URL}/rest/v1/people?employment_status=eq.active" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"

# Search by name (case insensitive)
curl -X GET "{SUPABASE_URL}/rest/v1/people?or=(first_name.ilike.*john*,last_name.ilike.*john*)" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"
```

**Response**:
```json
[
  {
    "id": "uuid",
    "client_id": "uuid", 
    "person_code": "hh-001",
    "first_name": "Anna",
    "last_name": "Hansen", 
    "company_email": "anna.hansen@hygge-hvidlog.dk",
    "department": "IT & Development",
    "position": "Senior Software Engineer",
    "employment_status": "active",
    "associate_status": null,
    "start_date": "2024-01-15",
    "end_date": null,
    "created_at": "2025-07-02T14:00:00Z"
  }
]
```

### POST /people
Create a new person record.

```bash
curl -X POST "{SUPABASE_URL}/rest/v1/people" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "client_id": "uuid",
    "person_code": "hh-new-001", 
    "first_name": "John",
    "last_name": "Smith",
    "company_email": "john.smith@company.com",
    "department": "Engineering",
    "position": "Software Developer",
    "employment_status": "active",
    "start_date": "2025-07-01"
  }'
```

### PATCH /people
Update existing person records.

```bash
# Update employment status
curl -X PATCH "{SUPABASE_URL}/rest/v1/people?id=eq.{person_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "employment_status": "former",
    "end_date": "2025-07-01"
  }'
```

---

## 📋 Process Management

### GET /people_enrollments
Retrieve onboarding/offboarding process status.

```bash
# Get enrollment status for a person
curl -X GET "{SUPABASE_URL}/rest/v1/people_enrollments?person_id=eq.{person_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"
```

**Response**:
```json
[
  {
    "id": "uuid",
    "person_id": "uuid",
    "onboarding_completed": true,
    "completion_percentage": 95,
    "onboarding_status": "completed", 
    "offboarding_status": "not_started",
    "created_at": "2025-07-02T14:00:00Z"
  }
]
```

---

## 📄 Document Management

### GET /documents
Retrieve documents for a person.

```bash
# Get all documents for a person
curl -X GET "{SUPABASE_URL}/rest/v1/documents?person_id=eq.{person_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"

# Filter by document type
curl -X GET "{SUPABASE_URL}/rest/v1/documents?person_id=eq.{person_id}&type=eq.contract" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"
```

### POST /documents
Create a new document record.

```bash
curl -X POST "{SUPABASE_URL}/rest/v1/documents" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "person_id": "uuid",
    "name": "Employment Contract",
    "type": "contract",
    "status": "pending",
    "uploaded_at": "2025-07-02T14:00:00Z"
  }'
```

---

## ✅ Task Management

### GET /tasks
Retrieve tasks for a person.

```bash
# Get tasks by person
curl -X GET "{SUPABASE_URL}/rest/v1/tasks?person_id=eq.{person_id}" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"

# Filter by status and category
curl -X GET "{SUPABASE_URL}/rest/v1/tasks?status=eq.pending&category=eq.onboarding" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"
```

### POST /tasks
Create a new task.

```bash
curl -X POST "{SUPABASE_URL}/rest/v1/tasks" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "person_id": "uuid",
    "title": "Complete IT Security Training",
    "description": "Complete mandatory security training module",
    "category": "training",
    "status": "not_started",
    "priority": "high",
    "assigned_by": "HR Team",
    "due_date": "2025-07-15T17:00:00Z"
  }'
```

---

## 🏢 Client Management

### GET /clients
Retrieve client information.

```bash
# Get all clients (admin only)
curl -X GET "{SUPABASE_URL}/rest/v1/clients" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"

# Get specific client
curl -X GET "{SUPABASE_URL}/rest/v1/clients?client_code=eq.hygge-hvidlog" \
  -H "Authorization: Bearer {token}" \
  -H "apikey: {api_key}"
```

---

## 🔍 Advanced Querying

### Filtering Options
```bash
# Equality
?column=eq.value

# Greater than / Less than  
?column=gt.value
?column=lt.value

# Pattern matching
?column.like.*pattern*
?column.ilike.*pattern*  # Case insensitive

# Multiple conditions (AND)
?column1=eq.value1&column2=eq.value2

# Multiple conditions (OR)
?or=(column1.eq.value1,column2.eq.value2)
```

### Pagination
```bash
# Limit results
?limit=50

# Offset for pagination
?offset=100

# Range (more efficient than offset)
-H "Range: 0-49"  # First 50 records
```

### Sorting
```bash
# Sort ascending
?order=created_at.asc

# Sort descending  
?order=created_at.desc

# Multiple sort columns
?order=department.asc,last_name.asc
```

---

## ⚠️ Error Handling

### Standard Error Responses

**400 Bad Request**
```json
{
  "code": "PGRST106",
  "details": "The schema must be one of the following: api",
  "hint": null,
  "message": "Invalid schema specified"
}
```

**401 Unauthorized**
```json
{
  "message": "JWT expired"
}
```

**403 Forbidden**
```json
{
  "message": "Insufficient privileges"
}
```

**404 Not Found**
```json
{
  "message": "No rows found"
}
```

**409 Conflict**
```json
{
  "code": "23505",
  "details": "Key (person_code)=(hh-001) already exists.",
  "message": "duplicate key value violates unique constraint"
}
```

### Error Handling Best Practices

1. **Always check HTTP status codes** before processing responses
2. **Parse error details** for specific constraint violations  
3. **Implement retry logic** for temporary failures (500, 502, 503)
4. **Log errors** with request context for debugging

---

## 🔒 Security Considerations

### Required Headers
- **Authorization**: Bearer token for authentication
- **apikey**: Supabase anon/service key
- **Content-Type**: application/json for POST/PATCH requests

### Row Level Security (RLS)
- All endpoints enforce **client-based isolation**
- Users can only access data for their associated client
- Service role bypasses RLS for admin operations

### Rate Limiting
- **Standard**: 1000 requests per minute per API key
- **Burst**: Up to 2000 requests in 60-second window
- **Headers**: Check `X-RateLimit-*` response headers

---

## 📝 Common Integration Patterns

### 1. Employee Onboarding Flow
```bash
# 1. Create person record
POST /people

# 2. Create enrollment record
POST /people_enrollments  

# 3. Create onboarding tasks
POST /tasks (multiple)

# 4. Track progress
GET /people_enrollments?person_id=eq.{id}
```

### 2. Employee Offboarding Flow
```bash
# 1. Update employment status
PATCH /people?id=eq.{id} {"employment_status": "former", "end_date": "..."}

# 2. Create offboarding tasks
POST /tasks (multiple with category=offboarding)

# 3. Track completion
GET /tasks?person_id=eq.{id}&category=eq.offboarding
```

### 3. Bulk Operations
```bash
# Use JSON arrays for bulk inserts
POST /people
[
  {"person_code": "bulk-001", ...},
  {"person_code": "bulk-002", ...}
]
```

---

## 🚀 SDK Examples

### JavaScript/TypeScript
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'api' }
})

// Get active employees
const { data, error } = await supabase
  .from('people')
  .select('*')
  .eq('employment_status', 'active')
  .order('last_name')
```

### Python
```python
from supabase import create_client

supabase = create_client(supabase_url, supabase_key)

# Create new person
response = supabase.table('people').insert({
    'person_code': 'py-001',
    'first_name': 'Jane',
    'last_name': 'Doe',
    'employment_status': 'active'
}).execute()
```

---

## 📊 Performance Tips

1. **Use specific selects** instead of `*` to reduce payload size
2. **Implement pagination** for large datasets (limit + offset or range headers)
3. **Use indexes effectively** by filtering on indexed columns (person_code, client_id, employment_status)
4. **Batch operations** when creating multiple records
5. **Cache frequently accessed** reference data (clients, departments)

---

## 🤝 Support

For API questions or integration support:
- **Documentation**: Check this reference and thepia.com flows docs
- **Examples**: See working examples in flows-admin-demo
- **Issues**: Create issues in the flows-client repository

**Note**: This API reference covers the core endpoints. Additional endpoints may be available - check the PostgREST auto-generated documentation at `{SUPABASE_URL}/rest/v1/` for complete endpoint discovery.