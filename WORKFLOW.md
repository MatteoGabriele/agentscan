# Daily User Scan Workflow

This workflow automatically scans GitHub users daily to generate analysis scores while maintaining complete anonymity.

## How It Works

### 1. **Scheduling**

- Runs daily at 00:00 UTC via GitHub Actions
- Can be manually triggered via `workflow_dispatch`

### 2. **User Discovery**

- Searches for GitHub users created at least 30 days ago
- Uses GitHub's search API with query: `created:<30-days-ago`
- Retrieves up to 100 users per day (1 page of results)

### 3. **Deduplication via One-Way Hashing**

Instead of storing user IDs, we use deterministic one-way hashing:

```
hash = SHA256(userId + "agentscan-v1")
```

**Key Properties:**

- **Deterministic**: Same user ID always produces the same hash
- **One-way**: Cannot reverse the hash back to the user ID
- **Static salt**: Uses `"agentscan-v1"` so hashes never change for the same user ID

**How it prevents duplicates:**

1. Generate hash for each discovered user
2. Check if hash exists in `data/scanned-users-hashes.json`
3. If not found → scan the user and record the hash
4. If found → skip (user was already scanned on a previous day)

### 4. **Analysis Scoring**

For each new user found:

- Call the `identify-replicant` API endpoint
- Retrieve the analysis score
- Store the result with only the hash and score (fully anonymous)

### 5. **Data Storage**

#### `data/scanned-users-hashes.json`

Internal tracking file for deduplication (not exposed):

```json
{
  "a7f4e3c2b1...": {
    "hash": "a7f4e3c2b1...",
    "scannedAt": "2024-01-15"
  }
}
```

#### `data/scan-results.json`

**Completely anonymous** analysis results:

```json
[
  {
    "date": "2024-01-15",
    "hash": "a7f4e3c2b1...",
    "score": 85
  }
]
```

**Privacy by design:**

- ✅ No user IDs stored
- ✅ No usernames stored
- ✅ No IP addresses or personally identifiable information
- ✅ Only one-way hashes that cannot be reversed back to original users

## Configuration

**Maximum users per day:** 100 (in `scripts/scan-users.ts`)

```typescript
const USERS_TO_SCAN = 100;
```

**Hash salt:** `"agentscan-v1"` (in `scripts/scan-users.ts`)

```typescript
const STATIC_SALT = "agentscan-v1";
```

**Search criteria:** Users created at least 30 days ago (automatic)

## Testing Locally

To test the workflow locally:

```bash
# Install dependencies
npm install

# Set GitHub token
export GITHUB_TOKEN=<your-github-token>

# Run the scan script
npm exec tsx scripts/scan-users.ts
```

## Manual Trigger

Trigger the workflow manually via GitHub Actions UI or CLI:

```bash
gh workflow run scan-users.yml
```

## How Pagination Works

Since we can't use static pagination, the system uses:

- **Time-based filtering**: Always searches for users created 30+ days ago
- **Per-page limit**: 100 users per page (GitHub API max)
- **Deduplication**: The hash system ensures no duplicates across all days

If you scan more than 100 users per day, adjust `MAX_PAGES` in `scripts/scan-users.ts`:

```typescript
const MAX_PAGES = 1; // Set to 2 or more for higher volume
```

## Why One-Way Hashing?

- **No data retention liability**: Can't prove who was scanned if hash is the only identifier
- **GDPR compliant**: No personal data is stored in results
- **Secure**: Even if the results file is compromised, original user IDs remain unknown
- **Deterministic**: Same user always maps to same hash, allowing historical tracking without storing IDs
