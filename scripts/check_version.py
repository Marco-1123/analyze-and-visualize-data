#!/usr/bin/env python3
"""Check the Skill version, generated artifacts, and optional release tag."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


SEMVER = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--require-tag",
        action="store_true",
        help="require v<VERSION> to point at HEAD",
    )
    parser.add_argument("artifacts", nargs="*", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    skill_root = Path(__file__).resolve().parent.parent
    version = (skill_root / "VERSION").read_text(encoding="utf-8").strip()
    if not SEMVER.fullmatch(version):
        print(f"invalid VERSION: {version!r}", file=sys.stderr)
        return 1

    expected_meta = (
        f'<meta name="generator" '
        f'content="analyze-and-visualize-data {version}">'
    )
    for artifact in args.artifacts:
        text = artifact.resolve().read_text(encoding="utf-8")
        if expected_meta not in text:
            print(
                f"{artifact}: generator metadata does not match {version}",
                file=sys.stderr,
            )
            return 1

    if args.require_tag:
        result = subprocess.run(
            ["git", "tag", "--points-at", "HEAD"],
            cwd=skill_root,
            check=True,
            capture_output=True,
            text=True,
        )
        if f"v{version}" not in result.stdout.splitlines():
            print(f"v{version} does not point at HEAD", file=sys.stderr)
            return 1

    print(
        f"PASS: version {version}; "
        f"{len(args.artifacts)} artifact(s) checked"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
