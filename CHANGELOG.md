# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Plugin icon, social preview image, issue templates, contributing guide, CI and troubleshooting section.

### Planned
- Auto-off timer (for example, turn the mode off after 8 hours).
- A `/lid` slash command as an alternative to the button.
- Support for Linux systems without systemd.

## [0.2.0] - 2026-11-06

### Added
- Linux support through a `systemd-inhibit` lid-switch lock.
- Windows support through `powercfg` (restores the previous lid action).
- The button now sits in the footer, just left of the status items.
- Auto-off when the Claude Code session ends.
- README, MIT license, marketplace manifest, tests.

### Changed
- Smaller, plain, dim button without brackets or bold text.

## [0.1.0] - 2026-11-06

### Added
- First version: macOS only, `sudo pmset -a disablesleep 1 / 0` behind a toggle button.
