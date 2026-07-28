#!/usr/bin/env python3
"""Run the complete shared-Skill validation and browser regression suite."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "assets" / "examples"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--quick",
        action="store_true",
        help="skip browser runtime tests; keep contracts and artifact validation",
    )
    parser.add_argument(
        "--require-tag",
        action="store_true",
        help="also require v<VERSION> to point at HEAD",
    )
    return parser.parse_args()


def run(label: str, command: list[str], *, env: dict[str, str] | None = None) -> None:
    result = subprocess.run(
        command,
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
    )
    if result.returncode:
        print(f"FAIL: {label}", file=sys.stderr)
        if result.stdout:
            print(result.stdout.rstrip(), file=sys.stderr)
        if result.stderr:
            print(result.stderr.rstrip(), file=sys.stderr)
        raise SystemExit(result.returncode)
    print(f"PASS: {label}")


def resolve_browser_runtime() -> tuple[str, dict[str, str]]:
    env = os.environ.copy()
    candidates: list[Path] = []
    configured = env.get("NODE_PATH")
    if configured:
        candidates.extend(Path(item) for item in configured.split(os.pathsep))
    runtime_root = Path.home() / ".cache" / "codex-runtimes"
    candidates.extend(
        sorted(
            runtime_root.glob("*/dependencies/node/node_modules"),
            reverse=True,
        )
    )
    node_modules = next(
        (
            candidate
            for candidate in candidates
            if (candidate / "playwright").exists()
        ),
        None,
    )
    if node_modules is None:
        raise RuntimeError(
            "Playwright was not found. Load the Codex workspace dependencies "
            "or set NODE_PATH to a node_modules directory containing playwright."
        )
    env["NODE_PATH"] = str(node_modules)
    bundled_node = node_modules.parent / "bin" / "node"
    node = str(bundled_node) if bundled_node.is_file() else shutil.which("node")
    if not node:
        raise RuntimeError("Node.js was not found for browser regression tests.")
    return node, env


def main() -> int:
    args = parse_args()
    artifacts = sorted(EXAMPLES.glob("*.html"))
    if not artifacts:
        print("FAIL: no generated example artifacts found", file=sys.stderr)
        return 1

    version_command = [sys.executable, "scripts/check_version.py"]
    if args.require_tag:
        version_command.append("--require-tag")
    version_command.extend(str(path) for path in artifacts)
    run("semantic version and generated metadata", version_command)
    run("specification contracts", [sys.executable, "scripts/test_spec_contracts.py"])
    run(
        "analysis planning and evidence contracts",
        [sys.executable, "scripts/test_analysis_planning.py"],
    )
    run(
        "canonical analysis bundle",
        [
            sys.executable,
            "scripts/validate_analysis_bundle.py",
            "--facts",
            "assets/examples/multi-queue-analysis-facts.json",
            "--plan",
            "assets/examples/multi-queue-analysis-plan.json",
            "--manifest",
            "assets/examples/multi-queue-report-manifest.json",
            "--spec",
            "assets/examples/report-multi-queue-matrix-spec.json",
            "--spec",
            "assets/examples/report-multi-queue-trends-spec.json",
        ],
    )
    for artifact in artifacts:
        run(
            f"artifact structure: {artifact.name}",
            [sys.executable, "scripts/validate_artifact.py", str(artifact)],
        )
    quick_validate = (
        ROOT.parent
        / ".system"
        / "skill-creator"
        / "scripts"
        / "quick_validate.py"
    )
    if not quick_validate.is_file():
        print(
            f"FAIL: Skill validator not found at {quick_validate}",
            file=sys.stderr,
        )
        return 1
    run(
        "Skill package structure",
        [sys.executable, str(quick_validate), "."],
    )

    if args.quick:
        print(f"PASS: quick QA completed for {len(artifacts)} artifacts")
        return 0

    try:
        node, browser_env = resolve_browser_runtime()
    except RuntimeError as error:
        print(f"FAIL: browser runtime: {error}", file=sys.stderr)
        return 1
    for script in (
        "scripts/test_p1_runtime.mjs",
        "scripts/test_line_value_labels.mjs",
        "scripts/test_multi_entity_runtime.mjs",
    ):
        run(
            f"browser regression: {Path(script).name}",
            [node, script],
            env=browser_env,
        )
    print(f"PASS: full QA completed for {len(artifacts)} artifacts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
