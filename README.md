# ECR Cleanup Script

A Node.js utility script to clean up old and untagged Docker images from AWS ECR repositories.

---

## Features

- Deletes untagged images
- Retains 2 latest images for each specified tag prefix
- Supports dry-run mode
- Filters based on image age and tag prefixes

---

## Setup Instructions

1. **Clone the repository**  
   ```bash
   git clone https://github.com/<your-username>/ecr-cleanup-script.git
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

## Example

node main.js --region us-east-1 --retention-days 7 --tag-prefixes latest,dev --dry-run

