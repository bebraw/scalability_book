#!/usr/bin/env python3
"""Generate a self-contained editorial diff using Git and the Python standard library."""

import argparse
from dataclasses import dataclass
from datetime import datetime
import difflib
import html
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import webbrowser


ASSETS = Path(__file__).with_name("review-diff-assets")
MAX_BYTES = 1024 * 1024
GROUPS = (
    "Book and case studies",
    "Assignments and lecture slides",
    "Demo wording",
    "Teaching notes and documentation",
    "Code, fixtures, and other files",
)


@dataclass
class Version:
    content: bytes
    mode: str


class ReviewError(Exception):
    pass


def git(root, *args):
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True, check=False
    )
    if result.returncode:
        raise ReviewError(result.stderr.decode("utf-8", errors="replace").strip())
    return result.stdout


def resolve_revision(root, revision):
    return git(
        root, "rev-parse", "--verify", "--end-of-options", revision + "^{commit}"
    ).decode().strip()


def tree(root, revision):
    entries = {}
    for record in git(root, "ls-tree", "-r", "-z", revision).split(b"\0"):
        if record:
            metadata, name = record.split(b"\t", 1)
            mode, kind, oid = metadata.decode().split()
            entries[name.decode("utf-8", errors="surrogateescape")] = (mode, oid, kind)
    return entries


def index(root):
    entries = {}
    for record in git(root, "ls-files", "--stage", "-z").split(b"\0"):
        if record:
            metadata, name = record.split(b"\t", 1)
            mode, oid, stage = metadata.decode().split()
            if stage != "0":
                raise ReviewError("The index has unresolved conflicts; use working-copy mode or resolve them first.")
            entries[name.decode("utf-8", errors="surrogateescape")] = (mode, oid, "blob")
    return entries


def read_version(root, name, entries):
    if entries is not None:
        entry = entries.get(name)
        if entry is None:
            return None
        mode, oid, kind = entry
        if kind != "blob" or mode not in ("100644", "100755"):
            raise ReviewError("Symlink or submodule; textual contents are not followed")
        if int(git(root, "cat-file", "-s", oid)) > MAX_BYTES:
            raise ReviewError("File exceeds the 1 MiB review limit")
        return Version(git(root, "cat-file", "blob", oid), mode)
    file = root / name
    if file.is_symlink():
        raise ReviewError("Symlink; target contents are not followed")
    # Do not traverse a replaced parent directory that is now a symlink.
    if any(parent.is_symlink() for parent in file.parents if parent != root and root in parent.parents):
        raise ReviewError("Path has a symlink parent; target contents are not followed")
    if not file.exists():
        return None
    if not file.is_file():
        raise ReviewError("Directory or submodule; no regular text file to display")
    info = file.stat()
    if info.st_size > MAX_BYTES:
        raise ReviewError("File exceeds the 1 MiB review limit")
    return Version(file.read_bytes(), "100755" if info.st_mode & 0o100 else "100644")


def decode(version):
    if version is None:
        return ""
    if b"\0" in version.content:
        raise ReviewError("Binary file; no text preview")
    try:
        return version.content.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ReviewError("File is not UTF-8 text; no text preview") from error


def file_group(name):
    if name.endswith(".notes.md"):
        return 3
    if name.startswith(("book/", "case-studies/")) or name == "bibliography.bib":
        return 0
    if name.startswith(("specifications/", "slides/")) and name.endswith(".md"):
        return 1
    if name.startswith("site/includes/") and name.endswith(".html"):
        return 2
    if name.endswith(".md"):
        return 3
    return 4


def is_book_file(name):
    return name.startswith(("book/", "case-studies/", "specifications/", "slides/")) or name == "bibliography.bib"


def normalize_lines(text, name):
    lines = text.splitlines()
    if not name.endswith(".md"):
        return lines
    # Preserve code-block whitespace and meaningful trailing Markdown spaces.
    fence = None
    result = []
    for line in lines:
        match = re.match(r"^\s*(`{3,}|~{3,})", line)
        if match:
            marker = match[1]
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
        if fence is None and line.strip().startswith("|"):
            line = " | ".join(cell.strip() for cell in line.strip().split("|"))
            # Table divider widths are formatting, not book content.
            line = re.sub(r"(?<= )(:?)-{3,}(:?)(?= )", r"\1---\2", line)
        result.append(line)
    return result


def word_diff(before, after):
    escape = html.escape
    if len(before) + len(after) > 24000:
        return "<del>" + escape(before) + "</del>", "<ins>" + escape(after) + "</ins>"
    a, b = (re.findall(r"\s+|\w+|[^\w\s]", text) for text in (before, after))
    left, right = [], []
    for tag, i, j, k, l in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        x, y = escape("".join(a[i:j])), escape("".join(b[k:l]))
        left.append(x if tag == "equal" else ("<del>" + x + "</del>" if x else ""))
        right.append(y if tag == "equal" else ("<ins>" + y + "</ins>" if y else ""))
    return "".join(left), "".join(right)


def line_range(start, end):
    return f"{start + 1}–{end}" if end > start else "∅"


def render_file(name, before, after, context, ident, expanded):
    old, new = decode(before), decode(after)
    a, b = normalize_lines(old, name), normalize_lines(new, name)
    matcher = difflib.SequenceMatcher(None, a, b)
    chunks = []
    for ops in matcher.get_grouped_opcodes(context):
        first, last = ops[0], ops[-1]
        chunks.append(f'<div class="hunk"><p class="range">Before {line_range(first[1], last[2])} <span>→</span> After {line_range(first[3], last[4])}</p>')
        for tag, i, j, k, l in ops:
            if tag == "equal":
                chunks.append('<pre class="context">' + html.escape("\n".join(b[k:l])) + '</pre>')
                continue
            left, right = word_diff("\n".join(a[i:j]), "\n".join(b[k:l]))
            chunks.append('<div class="change">')
            if j > i:
                chunks.append(f'<div class="before"><b>Before</b><pre>{left or "(blank line)"}</pre></div>')
            if l > k:
                chunks.append(f'<div class="after"><b>After</b><pre>{right or "(blank line)"}</pre></div>')
            else:
                chunks.append('<div class="after removed"><b>After</b><p>Removed.</p></div>')
            chunks.append('</div>')
        chunks.append('</div>')
    notes = []
    if before is None:
        notes.append("Added file" + (" (empty)" if not new else ""))
    elif after is None:
        notes.append("Deleted file" + (" (empty)" if not old else ""))
    else:
        if before.mode != after.mode:
            notes.append(f"File mode: {before.mode} → {after.mode}")
        if old.endswith("\n") != new.endswith("\n"):
            notes.append("Final newline " + ("added" if new.endswith("\n") else "removed"))
        if old != new and a == b and not notes:
            notes.append("Only Markdown table padding or line endings changed")
    for note in reversed(notes):
        chunks.insert(0, '<p class="file-note">' + html.escape(note) + '</p>')
    added = sum(l - k for tag, i, j, k, l in matcher.get_opcodes() if tag in ("insert", "replace"))
    removed = sum(j - i for tag, i, j, k, l in matcher.get_opcodes() if tag in ("delete", "replace"))
    escape = html.escape
    code_class = "" if name.endswith((".md", ".bib")) else " code-file"
    return f'<details class="file{code_class}" id="{ident}" data-path="{escape(name)}"{" open" if expanded else ""}><summary><span>{escape(name)}</span><small>+{added} / −{removed}</small></summary><div class="file-content">' + "".join(chunks) + '</div></details>'


def generate(root, options):
    base = resolve_revision(root, options.base)
    target = resolve_revision(root, options.to) if options.to else None
    old_entries = tree(root, base)
    new_entries = tree(root, target) if target else (index(root) if options.staged else None)
    diff_args = ["diff", "--no-ext-diff", "--no-renames", "--name-only", "-z"]
    if options.staged:
        diff_args.append("--cached")
    diff_args.append(base)
    if target:
        diff_args.append(target)
    diff_args.append("--")
    names = set(git(root, *diff_args).decode("utf-8", errors="surrogateescape").split("\0"))
    if not target and not options.staged:
        names.update(git(root, "ls-files", "--others", "--exclude-standard", "-z").decode("utf-8", errors="surrogateescape").split("\0"))
    output = (root / options.output).resolve()
    if output.suffix.lower() != ".html":
        raise ReviewError("Use an .html output path.")
    if output.is_relative_to(root):
        relative_output = output.relative_to(root).as_posix()
        if git(root, "ls-files", "--", relative_output):
            raise ReviewError("The output path is tracked by Git; choose a generated report path.")
        names.discard(relative_output)
    names.discard("")
    if options.book_only:
        names = {name for name in names if is_book_file(name)}
    sections, nav, skipped = [], [], []
    current_group, displayed = -1, 0
    for name in sorted(names, key=lambda item: (file_group(item), item)):
        try:
            before = read_version(root, name, old_entries)
            after = read_version(root, name, new_entries)
            if before is None and after is None:
                continue
            ident = f"file-{displayed}"
            content = render_file(name, before, after, options.context, ident, displayed < 6)
        except (ReviewError, OSError) as error:
            skipped.append((name, str(error)))
            continue
        group = file_group(name)
        if group != current_group:
            sections.append(f'<h2 class="group-title">{GROUPS[group]}</h2>')
            current_group = group
        sections.append(content)
        nav.append(f'<a href="#{ident}">{html.escape(name)}</a>')
        displayed += 1
    if not sections:
        sections.append('<p class="empty-state">No text changes to display for this comparison and filter.</p>')
    if skipped:
        sections.append('<section class="skipped"><h2>Changes without a text preview</h2><ul>' + "".join(f'<li><code>{html.escape(name)}</code> — {html.escape(reason)}</li>' for name, reason in skipped) + '</ul></section>')
    target_label = (options.to + " (" + target[:8] + ")") if target else ("Staged index" if options.staged else "Working copy, including untracked files")
    comparison = f"{options.base} ({base[:8]}) → {target_label}"
    generated = datetime.now().astimezone().strftime("%d %B %Y, %H:%M %Z")
    style = (ASSETS / "style.css").read_text()
    controls = (ASSETS / "controls.js").read_text()
    document = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Book changes · {html.escape(comparison)}</title><style>{style}</style></head><body>
<header><div class="eyebrow">Elements of Scalable Web Development / Editorial review</div><h1>What changed in the book</h1><p>Read the proposed revisions alongside the earlier text. Book content comes first; supporting changes follow. Up to six files are expanded to get you started.</p><div class="meta">{html.escape(comparison)}<br>{displayed} text files · {len(skipped)} without a text preview · {html.escape(generated)}{' · Book-only filter' if options.book_only else ''}</div></header>
<div class="toolbar" role="region" aria-label="Review controls"><button id="mode" aria-pressed="false">Read revised text only</button><button id="expand">Expand all</button><button id="collapse">Collapse all</button><input id="filter" type="search" aria-label="Filter files" placeholder="Filter files, e.g. specifications"><span id="filter-status" role="status"></span><div class="legend"><span class="old">− Removed</span><span class="new">+ Added</span></div></div>
<main><aside><details><summary>Jump to a file</summary><nav>{''.join(nav)}</nav></details></aside>{''.join(sections)}</main>
<footer>Snapshot of the selected Git comparison. {options.context} unchanged lines surround each change; larger unchanged passages are omitted. Markdown table padding is normalized outside fenced code. Renames appear as a deletion and an addition. Counts describe normalized lines. This page works offline and does not modify the repository.</footer><script>{controls}</script></body></html>'''
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", errors="replace", dir=output.parent, delete=False) as temporary:
        temporary.write(document)
        temporary_path = Path(temporary.name)
    temporary_path.replace(output)
    print(f"Review: {output}\n{comparison}\n{displayed} text files; {len(skipped)} changes without a text preview.")
    if not options.no_open and not webbrowser.open(output.as_uri()):
        print("The browser could not be opened automatically; open the HTML file directly.")
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="HEAD", help="Baseline commit or revision (default: HEAD)")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--to", metavar="REV", help="Compare to a committed revision instead of the working copy")
    mode.add_argument("--staged", action="store_true", help="Compare only the staged index against the baseline")
    parser.add_argument("--book-only", action="store_true", help="Include book, case studies, specifications, slides, and bibliography")
    parser.add_argument("--context", type=int, default=2, help="Unchanged lines around each change (0–20, default: 2)")
    parser.add_argument("--output", default=".local/reviews/book-changes.html", help="HTML output path, relative to the repository root")
    parser.add_argument("--no-open", action="store_true", help="Generate the report without opening a browser")
    options = parser.parse_args()
    if not 0 <= options.context <= 20:
        parser.error("--context must be between 0 and 20")
    try:
        root = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").decode().strip()).resolve()
        generate(root, options)
    except (ReviewError, OSError) as error:
        print(f"Review failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
