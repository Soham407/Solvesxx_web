---
name: update-context
description: Use after completing any feature, migration, or mock data fix to update all AI context files.
---

# Update AI Context Files

After completing your implementation, update the following files:

## 1. `.ai_context/PHASES.md`

- Change the module status:
  - 🔴 NOT BUILT → appropriate new status  
  - 🔵 UI-ONLY → 🟡 PARTIAL or ✅ FULL
  - 🟡 PARTIAL → ✅ FULL (if everything is wired)
- Remove items from "Known Mock Data" if you've replaced them
- Add entries to completed features

## 2. `.ai_context/CONTEXT.md`

- Add any new hooks to the hooks list (categorized by domain)
- Add any new components to the components reference
- Update the hook count if it changed

## 3. `.ai_context/SCOPE.md`

- Only update if the DB schema changed (new tables/columns added to Section 14)

## Verification

- [ ] PHASES.md status is accurate
- [ ] CONTEXT.md hooks list is complete  
- [ ] No stale "Known Mock Data" entries remain for completed work
