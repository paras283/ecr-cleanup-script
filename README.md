# ECR Cleanup Script

A Node.js utility script for cleaning up old or untagged images from AWS ECR (Elastic Container Registry), helping reduce unnecessary storage costs and clutter.
---

## Purpose

This script connects to all ECR repositories in a given AWS region and performs the following:

- Deletes untagged images.
- Deletes old tagged images not matching retention rules.
- Retains the 2 most recent images per tag prefix (e.g., prod, staging, v1).
- Supports a dry-run mode to preview actions without making changes.

---

## Setup Instructions

1. **Clone the repository**  
   ```bash
   git clone https://github.com/paras283/ecr-cleanup-script.git
   cd ecr-cleanup-script

2. **Install Dependencies**
   npm install

3. **Configure AWS credentials**
   Make sure your AWS credentials are configured properly (~/.aws/credentials or env vars).


## Usage

node main.js \
  --region <aws-region> \
  --retention-days <days> \
  --tag-prefixes <prefix1,prefix2,...> \
  [--dry-run]

## Example (with dry run - no deletion)

node main.js --region us-east-1 --retention-days 7 --tag-prefixes latest,dev --dry-run

## Scenarios

**Scenario 1: Untagged Images**
- Images without any tags will always be deleted, regardless of age.

**Scenario 2: Old Tagged Images**
- Images older than --retention-days and not among the 2 most recent images per prefix are deleted.

**Scenario 3: Recent or Protected Images**
- The 2 most recent images per tag prefix (e.g., prod-*, v1-*) will always be retained, even if they are older than the retention threshold.


## Logs

All actions are logged both to the console and to the file:
**ecr-cleanup.log**

You’ll find:

- Deletion targets
- Retained images
- Any errors or AWS failures


## Dry Run Explained

If you run the script with --dry-run, it will only print logs showing what it would delete, without actually deleting anything.