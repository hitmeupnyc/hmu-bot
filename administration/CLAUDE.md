## Memory Management Guidelines

- You should periodically jot down your thoughts in `/notes`, especially if it will help you remember important implementation details later.
- Your notes must be named consistently with a date prefix in the format YYYY-MM-DD followed by a sequence in the format \_X where x is a monotonically increasing integer.
- You expect to be able to access VS Code. If you can't, prompt me about it.
- This project uses sqlite, so you can inspect the database yourself. You can make your own dummy data, but don't do anything destructive, and make sure to describe how to reverse any DB changes.
- Please try to avoid curl, instead automating those steps through playwright.
- When possible, avoid storing boolean values. Bitfields as flags are preferable to booleans in all situations, bitfields and flags.

## Developer Experience

- **Single Command Startup**: Use `npm run dev:simple` to start both server and client
- **Process Management**: All processes managed by concurrently with `--kill-others` 
- **Port Auto-Detection**: Vite will automatically find available ports if default is busy
- **Organized Output**: Clear prefixes for server vs client logs
- **Easy Setup**: `npm run setup` installs all dependencies
- **Testing**: `npm test` runs e2e tests, `npm run test:e2e` for explicit e2e testing
- **Production**: `npm run build && npm start` for production deployment
