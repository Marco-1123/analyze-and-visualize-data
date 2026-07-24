# Skill maintenance and release policy

Read this file only when changing the Skill itself, its runtime, schemas,
templates, examples, or publishing workflow.

## Version source of truth

- Treat the root `VERSION` file as the machine-readable current version.
- Use semantic versions:
  - patch: fixes with no intended contract expansion;
  - minor: backward-compatible components, interactions, or schema additions;
  - major: incompatible schema, runtime, or publishing changes.
- Embed the current version in every generated HTML artifact.
- Use an annotated Git tag named `v<VERSION>` on every published version.
- Use GitHub Releases as the human-readable version history. Do not maintain a
  duplicate changelog inside the Skill.

## Conflict-safe update sequence

1. Inspect the working tree and preserve unrelated user changes.
2. Fetch the remote branch before editing.
3. If local and remote histories diverge, integrate them before feature work.
   Resolve conflicts by intent and data contract; never accept an entire
   conflicted generated file with a blanket “ours” or “theirs” choice.
4. Resolve source files first. For generated HTML or screenshots, resolve the
   specification, runtime, CSS, and scripts, then regenerate the outputs.
5. Search for conflict markers and run `git diff --check`.
6. Run the Skill validator, artifact validators, syntax checks, and rendered
   viewport/interactions checks.
7. Select the semantic version bump, update `VERSION`, and rebuild every bundled
   HTML so its generator metadata matches.
8. Commit the verified source and generated outputs together.
9. Create the annotated `v<VERSION>` tag only after validation succeeds.
10. Push the commit before the tag, confirm local and remote SHAs match, and
    publish or update the matching GitHub Release.

## Required release checks

Run:

```bash
python3 scripts/check_version.py assets/examples/*.html
python3 scripts/validate_artifact.py <each-artifact.html>
python3 <skill-creator>/scripts/quick_validate.py .
git diff --check
```

After creating the release tag, run:

```bash
python3 scripts/check_version.py --require-tag assets/examples/*.html
```

Do not tag a dirty, unvalidated, or partially merged worktree.
