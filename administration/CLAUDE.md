## Memory Management Guidelines

- Start the app with `npm run ports:clear; npm run dev`
  - `ports:clear` properly handles orphaned processes that turbo --parallel doesn't clean up
- `/Users/vcarl/workspace/hmu-product/administration` is the project root. You can go in administration/client/ and administration/server/, but when starting the app, do so from administration/.
- Write your thoughts in `/notes`, especially if it will help you remember important implementation details later.
- Your notes must be named consistently with a date prefix in the format `YYYY-MM-DD_X_title.md` where X is a monotonically increasing integer.
- This project uses sqlite at `server/data/club.db`, so you can inspect the database yourself. You can make your own dummy data, but don't do anything destructive, and make sure to describe how to reverse any DB changes.
- Prefer using your Playwright MCP over curl.
  - You can authenticate by checking the server logs for "fallback" and navigating to that url.
- When possible, avoid storing boolean values. Bitfields as flags are preferable to booleans in all situations, bitfields and flags.
- Always use React Query in client apps.
- Useful debug urls: 
  - `http://localhost:5173/debug` includes `:3000/health/env` output via the web
  - `http://localhost:3000/health`
- If you're trying to understand a dependency chain, you can see the complete list of files that will be imported from a given starting point by using `npx depcruise -c .dependency-cruiser.js <entry file> -T text`

When starting a new project, always read the README.md file in the root directory.
