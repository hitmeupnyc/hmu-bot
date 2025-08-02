# Dev Server Port Issue Resolution - 2025-08-02

## Problem Summary
Dev servers weren't releasing ports cleanly when stopped, causing issues when trying to restart the development environment.

## Root Cause Analysis ✅

### The Issue: Orphaned Process Problem
- **Turbo in parallel mode** (`turbo run dev --parallel`) doesn't properly forward termination signals to child processes
- When parent turbo process is killed, child processes (tsx, vite) remain running and hold onto ports
- This is a classic **process hierarchy signal propagation issue**

### Evidence Found:
1. **Graceful shutdown works fine**: Individual server has proper SIGTERM/SIGINT handlers
2. **Process tree issue**: Parent process termination doesn't cascade to children
3. **Confirmed with testing**: Killed turbo process PID 21613, but tsx (21767) and vite (21765) kept running

## Solution ✅

### Updated CLAUDE.md Recommendation:
**Before**: `lsof -ti:5173 -ti:3000 | xargs kill; npm run dev > /dev/null 2>&1 &`
**After**: `npm run dev:kill-ports; npm run dev > /dev/null 2>&1 &`

### Why This Works Better:
1. **Uses existing dev-utils.js script** which properly handles orphaned processes
2. **More robust**: Finds processes by port and force-kills them if needed
3. **Better error handling**: Provides feedback about what was killed
4. **Already tested and working**: The script was already in the codebase

## Technical Details

### Process Hierarchy Issue:
```
npm run dev
├── turbo run dev --parallel (PID 21613) [killed by SIGTERM]
├── tsx watch src/index.ts (PID 21767) [orphaned - still running]
└── vite (PID 21765) [orphaned - still running]
```

### The Fix:
The `dev:kill-ports` script directly targets processes by port:
```javascript
// From dev-utils.js
function findProcessOnPort(port) {
  const result = execSync(`lsof -ti:${port}`);
  return result.trim().split('\n').filter(pid => pid);
}

function killPort(port) {
  const pids = findProcessOnPort(port);
  if (pids.length > 0) {
    execSync(`kill -9 ${pids.join(' ')}`);
  }
}
```

## Testing Results ✅
- ✅ Ports are properly freed
- ✅ Clean restart works reliably 
- ✅ No more orphaned processes
- ✅ Servers start up cleanly after restart

## Key Insight
The issue wasn't with the individual server's shutdown handling (which was correct), but with **Turbo's process management in parallel mode**. The existing dev-utils script already solved this correctly by targeting ports directly rather than trying to manage the process tree.