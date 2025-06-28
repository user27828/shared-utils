# Source Data Files

This directory contains original source data files downloaded from authoritative sources. These files are used to generate the processed data files used by the application.

## Files

### languages.txt

- **Source**: Library of Congress - ISO 639-2 Language Codes
- **URL**: https://www.loc.gov/standards/iso639-2/ISO-639-2_utf-8.txt
- **Format**: Tab-separated values (TSV)
- **Description**: Official ISO 639-2 language codes with native names
- **Columns**:
  - ISO 639-2/B code (bibliographic)
  - ISO 639-2/T code (terminology)
  - ISO 639-1 code (2-letter)
  - English name
  - French name

### countries.csv

- **Source**: DataHub.io - Country Codes Dataset
- **URL**: https://datahub.io/core/country-codes/r/country-codes.csv
- **Format**: Comma-separated values (CSV)
- **Description**: Comprehensive country codes and metadata
- **Columns**: Multiple standardized country identifiers (ISO, FIFA, IOC, etc.) plus additional metadata

## Usage

To update these source files, run:

```bash
yarn update:data
```

This will:

1. Create timestamped backups of existing files
2. Download fresh copies from the official sources
3. Report download status and file statistics

## Processing

After updating source files, you may need to:

1. Review the files for any structural changes
2. Update data processing scripts if the format has changed
3. Regenerate the application data files from these sources
4. Test the application to ensure compatibility

## Backup Policy

The update script automatically creates timestamped backups before downloading new files. Old backups can be manually cleaned up as needed.
