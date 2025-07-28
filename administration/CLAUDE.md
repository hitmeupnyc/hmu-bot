## Memory Management Guidelines

- You should periodically jot down your thoughts in `/notes`, especially if it will help you remember important implementation details later.
- Your notes must be named consistently with a date prefix in the format YYYY-MM-DD followed by a sequence in the format \_X where x is a monotonically increasing integer.
- You expect to be able to access VS Code. If you can't, prompt me about it.
- This project uses sqlite, so you can inspect the database yourself. You can make your own dummy data, but don't do anything destructive, and make sure to describe how to reverse any DB changes.
- Please try to avoid curl, instead automating those steps through playwright.
- When possible, avoid storing boolean values. Bitfields as flags are preferable to booleans in all situations, bitfields and flags.
