"""
Convert a JSON[L] file that contains quoted integers for "id", "start", and "end"
    fields into BIGINTs
Example: python3 scripts/convert-bigint-ids.py somedata.json [-o somedata-output-name.json]
"""
import json
import argparse
import re
import os

def convert_to_bigint(data):
    """
    Converts numeric "id", "start", and "end" properties in the data to unquoted BIGINT format.

    Args:
      data: A Python dictionary representing the JSON data.

    Returns:
      A modified dictionary with the specified properties converted.
    """
    if isinstance(data, dict):
        for key, value in data.items():
            if key in ("id", "start", "end") and (isinstance(value, (int, float)) or (isinstance(value, str) and re.match(r'^\d+$', value))):
                data[key] = int(value)  # Convert to integer
            else:
                data[key] = convert_to_bigint(value)
    elif isinstance(data, list):
        for i in range(len(data)):
            data[i] = convert_to_bigint(data[i])
    return data

def process_file(input_file, output_file=None):
    """
    Processes the input file and writes the converted data to the output file.

    Args:
      input_file: Path to the input JSON[L] file.
      output_file: Path to the output file. If none, "-bigint" is appended to the input file basename.
    """
    if output_file is None:
        base, ext = os.path.splitext(input_file)
        output_file = f"{base}-bigint{ext}"

    with open(input_file, 'r') as infile, open(output_file, 'w') as outfile:
        for line in infile:
            try:
                # Try parsing as JSONL (one object per line)
                data = json.loads(line)
                converted_data = convert_to_bigint(data)
                outfile.write(json.dumps(converted_data) + '\n')  # Keep minified
            except json.JSONDecodeError:
                try:
                    # If not JSONL, try parsing as a single JSON object
                    infile.seek(0)  # Rewind the file
                    data = json.load(infile)
                    converted_data = convert_to_bigint(data)
                    outfile.write(json.dumps(converted_data))  # Keep minified
                    break  # Only one object in the file
                except json.JSONDecodeError:
                    print(f"Error: Invalid JSON format in file {input_file}")
                    return

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert numeric 'id', 'start', and 'end' properties to BIGINT in JSON/JSONL files.")
    parser.add_argument("input_file", help="Path to the input JSON or JSONL file")
    parser.add_argument("-o", "--output_file", help="Path to the output file (optional)")
    args = parser.parse_args()

    process_file(args.input_file, args.output_file)