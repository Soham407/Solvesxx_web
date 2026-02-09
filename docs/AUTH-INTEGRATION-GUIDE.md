# Authentication Integration Guide

## Overview

This document explains how to integrate the authentication system to replace hardcoded mock IDs with actual authenticated user IDs throughout the application.

## What Was Created

### `hooks/useAuth.ts`

A new authentication hook and context provider that:

- Manages user authentication state
- Provides the current user and user ID
- Handles sign-out functionality
- Listens for auth state changes

## Integration Steps

### 1. Wrap Your App with AuthProvider

Add the `AuthProvider` to your root layout or app component:

```tsx
// app/layout.tsx or similar
import { AuthProvider } from "@/hooks/useAuth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 2. Replace Mock IDs in Components

#### GuardDashboard.tsx

**Current (lines 39-40):**

```tsx
// Mock employee ID - In production, get this from auth context
const MOCK_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111111";
```

**Replace with:**

```tsx
import { useAuth } from "@/hooks/useAuth";

export function GuardDashboard() {
  const { userId, isLoading: isAuthLoading } = useAuth();

  // Show loading state while auth is initializing
  if (isAuthLoading) {
    return <div>Loading authentication...</div>;
  }

  // Require authentication
  if (!userId) {
    return <div>Please log in to access the guard dashboard.</div>;
  }

  // Pass userId to hooks instead of MOCK_EMPLOYEE_ID
  const {
    isWithinRange,
    distance,
    // ... other values
  } = useAttendance(userId);

  // ... rest of component
}
```

#### ResidentDashboard.tsx

**Current (lines 54-55):**

```tsx
// Mock resident ID - In production, get this from auth context
const MOCK_RESIDENT_ID = "22222222-2222-2222-2222-222222222222";
```

**Replace with:**

```tsx
import { useAuth } from "@/hooks/useAuth";

export function ResidentDashboard() {
  const { userId, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!userId) {
    return <div>Please log in to access the resident dashboard.</div>;
  }

  // Pass userId to useResident hook
  const {
    resident,
    visitors,
    // ... other values
  } = useResident(userId);

  // ... rest of component
}
```

#### AddVisitorForm.tsx

**Current (line 186):**

```tsx
const dummyGuardId = "00000000-0000-0000-0000-000000000000";
```

**Replace with:**

```tsx
import { useAuth } from "@/hooks/useAuth";

export function AddVisitorForm({ onSuccess, onCancel }: AddVisitorFormProps) {
  const { userId } = useAuth();

  // In handleSubmit, replace dummyGuardId with userId
  const { data: visitorData, error: visitorError } = await supabase
    .from("visitors")
    .insert({
      // ... other fields
      entry_guard_id: userId || null, // Use authenticated user ID
      entry_time: new Date().toISOString(),
    })
    .select()
    .single();
}
```

### 3. Handle Unauthenticated States

For development and testing, you can provide fallback behavior:

```tsx
export function GuardDashboard() {
  const { userId, isLoading: isAuthLoading } = useAuth();

  // For dev/test: allow fallback to mock ID
  const effectiveUserId = userId || process.env.NEXT_PUBLIC_DEV_GUARD_ID;

  if (isAuthLoading) {
    return <LoadingSpinner />;
  }

  if (!effectiveUserId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Authentication Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please log in to access the guard dashboard.
          </p>
          <Button onClick={() => (window.location.href = "/login")}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ... rest of component
}
```

## Database Considerations

### Linking Users to Guards/Residents

You'll need to ensure your database has proper relationships:

```sql
-- Option 1: Store auth.uid in employee_id/resident_id columns
-- This assumes employee_id and resident_id reference auth.users.id

-- Option 2: Create a mapping table
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id),
  guard_id UUID REFERENCES security_guards(id),
  resident_id UUID REFERENCES residents(id),
  role TEXT CHECK (role IN ('guard', 'resident', 'admin'))
);

-- Then query to get the appropriate ID:
-- For guards:
SELECT guard_id FROM user_roles WHERE user_id = auth.uid() AND role = 'guard';

-- For residents:
SELECT resident_id FROM user_roles WHERE user_id = auth.uid() AND role = 'resident';
```

### Update Hooks to Support User Mapping

If using a mapping table, update hooks like this:

```tsx
// hooks/useAttendance.ts
export function useAttendance(userId?: string) {
  const [guardId, setGuardId] = useState<string | null>(null);

  // Fetch guard ID from user ID
  useEffect(() => {
    if (!userId) return;

    async function fetchGuardId() {
      const { data } = await supabase
        .from("security_guards")
        .select("id")
        .eq("employee_id", userId)
        .single();

      setGuardId(data?.id || null);
    }

    fetchGuardId();
  }, [userId]);

  // Use guardId for all operations
  // ...
}
```

## Security Benefits

After implementing authentication:

1. **No Impersonation**: Users can only access their own data
2. **Audit Trail**: All actions are tied to authenticated users
3. **RLS Enforcement**: Database policies can enforce user-level access
4. **Session Management**: Automatic handling of login/logout

## Testing Checklist

- [ ] AuthProvider is added to root layout
- [ ] GuardDashboard uses authenticated user ID
- [ ] ResidentDashboard uses authenticated user ID
- [ ] AddVisitorForm uses authenticated guard ID
- [ ] Unauthenticated users see appropriate messages
- [ ] Login/logout flow works correctly
- [ ] Database relationships are properly configured
- [ ] RLS policies are enabled and tested

## Environment Variables (Optional)

For development, you can use environment variables for fallback IDs:

```env
# .env.local
NEXT_PUBLIC_DEV_GUARD_ID=11111111-1111-1111-1111-111111111111
NEXT_PUBLIC_DEV_RESIDENT_ID=22222222-2222-2222-2222-222222222222
```

## Next Steps

1. Implement login/signup pages
2. Add role-based routing
3. Enable RLS on all tables
4. Add server-side auth checks for API routes
5. Implement password reset functionality

---

**Status**: ✅ Auth Hook Created - Ready for Integration

The `useAuth` hook is now available. Follow the steps above to integrate it into your dashboards and forms.
