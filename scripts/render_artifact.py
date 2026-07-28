#!/usr/bin/env python3
"""Render and inspect an arbitrary artifact with the bundled browser runtime."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from run_qa import ROOT, resolve_browser_runtime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument(
        "--viewports",
        default="390x844,520x900,818x1000,880x1000,1440x1000",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    artifact = args.input.resolve()
    if not artifact.is_file():
        print(f"FAIL: artifact does not exist: {artifact}", file=sys.stderr)
        return 1
    try:
        node, env = resolve_browser_runtime()
    except RuntimeError as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    command = [
        node,
        str(ROOT / "scripts" / "render_artifact.mjs"),
        "--input",
        str(artifact),
        "--output-dir",
        str(args.output_dir.resolve()),
        "--viewports",
        args.viewports,
    ]
    result = subprocess.run(command, cwd=ROOT, env=env, text=True)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
