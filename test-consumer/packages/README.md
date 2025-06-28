# Local Package Builds

This directory contains locally built packages for development and testing purposes.

## Contents

- `user27828-shared-utils-*.tgz` - Packed npm packages for local testing

## Usage

These packages are automatically created by the build scripts and referenced by the test applications. They are not part of the distributed package and should not be committed to version control.

## Build Process

The packages are created using:

```bash
# From the root shared-utils directory
npm pack --pack-destination test-consumer/packages
```

Or use the automated script:

```bash
yarn update:local
```

## Why This Organization?

- Keeps the root directory clean
- Separates development artifacts from distribution code
- Makes it clear these are test-only dependencies
- Easier to manage and clean up
