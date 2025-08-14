## Memory Management Guidelines

- You can reliably restart the app by using `npm run dev:clear-ports; npm run dev > /dev/null 2>&1 &`
  - The ports:clear script properly handles orphaned processes that turbo --parallel doesn't clean up
  - You must always use ` > /dev/null 2>&1 &` when you run something in the background.
- `/Users/vcarl/workspace/hmu-product/administration` is the project root. You can go in administration/client/ and administration/server/, but when starting the app, do so from administration/.
- You expect to be able to access an IDE. If you can't, prompt me about it.
- Write your thoughts in `/notes`, especially if it will help you remember important implementation details later.
- Your notes must be named consistently with a date prefix in the format `YYYY-MM-DD_X_title.md` where X is a monotonically increasing integer.
- This project uses sqlite, so you can inspect the database yourself. You can make your own dummy data, but don't do anything destructive, and make sure to describe how to reverse any DB changes.
- Prefer using your Playwright MCP over curl.
- When possible, avoid storing boolean values. Bitfields as flags are preferable to booleans in all situations, bitfields and flags.
- Always use React Query in client apps.
- Useful debug urls: 
  - `http://localhost:5173/debug` includes `:3000/health/env` output via the web
  - `http://localhost:3000/health`
- If you're trying to understand a dependency chain, you can see the complete list of files that will be imported from a given starting point by using `npx depcruise -c .dependency-cruiser.js <entry file> -T text`

The @administration/README.md file contains a list of developer commands, as well as information about the overall structure of the project. If you don't find something you expect to in there, ask me about it.
