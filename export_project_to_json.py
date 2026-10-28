#!/usr/bin/env python3
"""Export a directory into a JSON array with file name and content.

Output format per item:
{
  "name": "relative/path/to/file",
  "content": "file text OR BASE64:<base64>"
}
"""

from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export project files to JSON with name and content."
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root directory to export (default: current directory).",
    )
    parser.add_argument(
        "--output",
        default="project_snapshot.json",
        help="Output JSON file path (default: project_snapshot.json).",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[".git"],
        help=(
            "Directory or file names to exclude anywhere in the tree. "
            "Repeat for multiple values. Defaults to excluding .git."
        ),
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output.",
    )
    return parser.parse_args()


def is_binary(data: bytes) -> bool:
    if not data:
        return False

    if b"\x00" in data:
        return True

    try:
        data.decode("utf-8")
        return False
    except UnicodeDecodeError:
        return True


def should_exclude(path: Path, excluded_names: set[str]) -> bool:
    return any(part in excluded_names for part in path.parts)


def export_files(
    root: Path, excluded_names: set[str], excluded_paths: set[Path]
) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []

    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue

        if path.resolve() in excluded_paths:
            continue

        rel_path = path.relative_to(root)

        if should_exclude(rel_path, excluded_names):
            continue

        data = path.read_bytes()
        if is_binary(data):
            entries.append(
                {
                    "name": rel_path.as_posix(),
                    "content": "BASE64:" + base64.b64encode(data).decode("ascii"),
                }
            )
        else:
            entries.append(
                {
                    "name": rel_path.as_posix(),
                    "content": data.decode("utf-8"),
                }
            )

    return entries


def main() -> None:
    args = parse_args()
    root = Path(args.root).resolve()
    output_path = Path(args.output).resolve()
    excluded_names = set(args.exclude)

    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Root directory does not exist or is not a directory: {root}")

    excluded_paths = {output_path}
    result = export_files(root, excluded_names, excluded_paths)

    payload = {
        "root": str(root),
        "file_count": len(result),
        "files": result,
    }

    if args.pretty:
        output_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
    else:
        output_path.write_text(
            json.dumps(payload, separators=(",", ":"), ensure_ascii=False),
            encoding="utf-8",
        )

    print(f"Exported {len(result)} files to {output_path}")


if __name__ == "__main__":
    main()
