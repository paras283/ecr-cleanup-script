# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [v1.0.0] - 2025-04-22

### Added
- Support for deleting **untagged** images from ECR.
- Ability to **retain latest 2 images** for each provided tag prefix.
- **Dry-run mode** to simulate deletions without actually deleting images.
- CLI options for:
  - AWS region (`--region`)
  - Retention period in days (`--retention-days`)
  - Tag prefixes (`--tag-prefixes`)
  - Dry run flag (`--dry-run`)
- Logging of images **to be deleted** and **to be retained**.
- Git workflow documentation and release version tagging.

### Fixed
- Issue where protected images that were not old were not being retained.

---

