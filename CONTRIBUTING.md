# Contributing

Thanks for helping. This is a small mod, so the process is small too.

## Report a bug
Open an issue with the bug template. The most useful details are your operating system, your Claude Code version and what the button showed.

## Send a change
1. Fork the repo and create a branch.
2. Run the mod from your clone: `claude --plugin-dir ./lid-awake`.
3. Before you open a pull request, make sure these pass:
   ```bash
   claude plugin validate .
   claude plugin test .
   ```
4. Keep it simple. One mod, one file of logic (`hooks/register.tsx`), no dependencies.
5. Add a line under `[Unreleased]` in `CHANGELOG.md`.

## Testing on other systems
The Linux and Windows paths are the least tested. A pull request that confirms or fixes them is very welcome, even if it only changes a line.
