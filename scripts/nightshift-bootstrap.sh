#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/nightshift-bootstrap.sh [options]

Creates a safe tag on the current commit and prepares an isolated nightly worktree
and branch for Night Shift runs.

Options:
  --date YYYY-MM-DD         Override date used in tag/branch names (default: today)
  --tag NAME                Override safe tag name (default: safe/<date>-pre-nightshift)
  --branch NAME             Override nightly branch name (default: codex/nightly/<date>-nightshift)
  --worktree PATH           Override worktree path (default: sibling "<repo>-nightshift")
  --allow-dirty             Allow bootstrapping from a dirty working tree (not recommended)
  --dry-run                 Print actions without making changes
  -h, --help                Show this help
EOF
}

repo_root="$(git rev-parse --show-toplevel)"
current_branch="$(git rev-parse --abbrev-ref HEAD)"
repo_name="$(basename "$repo_root")"
default_date="$(date +%Y-%m-%d)"

run_date="$default_date"
allow_dirty=0
dry_run=0
tag_name=""
branch_name=""
worktree_path=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --date)
      run_date="${2:?missing value for --date}"
      shift 2
      ;;
    --tag)
      tag_name="${2:?missing value for --tag}"
      shift 2
      ;;
    --branch)
      branch_name="${2:?missing value for --branch}"
      shift 2
      ;;
    --worktree)
      worktree_path="${2:?missing value for --worktree}"
      shift 2
      ;;
    --allow-dirty)
      allow_dirty=1
      shift
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$tag_name" ]]; then
  tag_name="safe/${run_date}-pre-nightshift"
fi

if [[ -z "$branch_name" ]]; then
  branch_name="codex/nightly/${run_date}-nightshift"
fi

if [[ -z "$worktree_path" ]]; then
  parent_dir="$(dirname "$repo_root")"
  worktree_path="${parent_dir}/${repo_name}-nightshift"
fi

run() {
  if [[ "$dry_run" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

echo "Repo root:     $repo_root"
echo "Current branch: $current_branch"
echo "Safe tag:      $tag_name"
echo "Nightly branch: $branch_name"
echo "Worktree path: $worktree_path"

if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
  echo "Refusing bootstrap: current branch is '$current_branch' (expected main/master)." >&2
  exit 1
fi

if [[ "$allow_dirty" -ne 1 ]]; then
  if [[ -n "$(git -C "$repo_root" status --porcelain)" ]]; then
    echo "Refusing bootstrap from dirty working tree. Commit/stash first or use --allow-dirty." >&2
    exit 1
  fi
fi

head_sha="$(git -C "$repo_root" rev-parse HEAD)"
echo "HEAD commit:   $head_sha"

if git -C "$repo_root" rev-parse -q --verify "refs/tags/${tag_name}" >/dev/null; then
  existing_tag_sha="$(git -C "$repo_root" rev-list -n 1 "$tag_name")"
  echo "Tag exists:    $tag_name ($existing_tag_sha)"
  if [[ "$existing_tag_sha" != "$head_sha" ]]; then
    echo "Existing tag points to a different commit; choose a different --tag." >&2
    exit 1
  fi
else
  run git -C "$repo_root" tag "$tag_name" "$head_sha"
  echo "Created tag:   $tag_name"
fi

branch_exists=0
if git -C "$repo_root" show-ref --verify --quiet "refs/heads/${branch_name}"; then
  branch_exists=1
  echo "Branch exists: $branch_name"
fi

if [[ -d "$worktree_path/.git" || -f "$worktree_path/.git" ]]; then
  echo "Worktree exists: $worktree_path"
  worktree_branch="$(git -C "$worktree_path" rev-parse --abbrev-ref HEAD)"
  if [[ "$worktree_branch" != "$branch_name" ]]; then
    echo "Existing worktree branch '$worktree_branch' does not match requested '$branch_name'." >&2
    exit 1
  fi
else
  if [[ "$branch_exists" -eq 1 ]]; then
    run git -C "$repo_root" worktree add "$worktree_path" "$branch_name"
  else
    run git -C "$repo_root" worktree add -b "$branch_name" "$worktree_path" HEAD
  fi
  echo "Created worktree: $worktree_path"
fi

cat <<EOF

Night Shift bootstrap complete.
Next steps:
  cd "$worktree_path"
  npm run nightshift:dry-run
  npm run nightshift:run
EOF
