"""Exercise the review command against disposable Git repositories."""

from pathlib import Path
import html
import re
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "review-diff.py"


class ReviewDiffTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="book-review-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.git("init", "-q")
        self.write(".gitignore", ".local/\n")
        self.write("book/intro.md", "BASELINE_MARKER\n")
        self.write("book/removed.md", "This chapter is going away.\n")
        self.write("site/tracked.html", "Existing tracked page.\n")
        self.commit()

    def git(self, *args):
        return subprocess.run(
            ["git", *args], cwd=self.root, check=True, capture_output=True
        ).stdout.decode()

    def write(self, name, content):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            file.write_bytes(content)
        else:
            file.write_text(content)

    def commit(self):
        self.git("add", ".")
        self.git("-c", "user.name=Review Test", "-c", "user.email=review@example.invalid", "commit", "-qm", "Fixture")

    def run_review(self, *args, success=True):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--no-open", *args],
            cwd=self.root,
            capture_output=True,
            text=True,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        return result

    def report(self):
        return (self.root / ".local/reviews/book-changes.html").read_text()

    def test_working_copy_and_staged_mode_keep_distinct_contents(self):
        self.write("book/intro.md", "STAGED_MARKER\n")
        self.git("add", "book/intro.md")
        self.write("book/intro.md", "WORKTREE_MARKER\n")
        self.write("book/new chapter.md", "UNTRACKED_MARKER\n")
        self.write("book/empty.md", "")
        (self.root / "book/removed.md").unlink()
        self.run_review()
        output = self.report()
        for expected in ("BASELINE_MARKER", "WORKTREE_MARKER", "UNTRACKED_MARKER", "Deleted file", "Added file (empty)", "<ins>", "<del>"):
            self.assertIn(expected, output)
        self.assertNotIn("STAGED_MARKER", output)

        self.run_review("--staged")
        output = self.report()
        self.assertIn("STAGED_MARKER", output)
        for excluded in ("WORKTREE_MARKER", "UNTRACKED_MARKER", "Deleted file"):
            self.assertNotIn(excluded, output)

    def test_committed_range_ignores_pending_changes(self):
        self.write("book/intro.md", "COMMITTED_MARKER\n")
        self.commit()
        self.write("book/intro.md", "PENDING_MARKER\n")
        self.write("book/new.md", "UNTRACKED_MARKER\n")
        self.run_review("--base", "HEAD~1", "--to", "HEAD")
        output = self.report()
        self.assertIn("COMMITTED_MARKER", output)
        self.assertIn("BASELINE_MARKER", output)
        self.assertNotIn("PENDING_MARKER", output)
        self.assertNotIn("UNTRACKED_MARKER", output)

    def test_table_padding_is_normalized_but_fenced_text_is_preserved(self):
        self.write("book/table.md", "| Name | Value |\n| --- | --- |\n| x | y |\n")
        self.write("book/code.md", "```text\n| x | y |\n```\n")
        self.commit()
        self.write("book/table.md", "| Name   | Value |\n| ------ | ----- |\n| x      | y     |\n")
        self.write("book/code.md", "```text\n| x   | y |\n```\n")
        self.run_review()
        output = self.report()
        self.assertIn("Only Markdown table padding or line endings changed", output)
        self.assertIn('| x   | y |', html.unescape(re.sub(r'<[^>]+>', '', output)))

    def test_binary_large_and_symlink_files_are_listed_without_preview(self):
        self.write("book/binary.dat", b"secret-binary\0payload")
        self.write("book/large.md", "LARGE_CONTENT" * 100000)
        self.write("book/non-utf8.txt", b"\xff\xfe\xff")
        outside = self.root.parent / (self.root.name + "-outside.txt")
        outside.write_text("DO_NOT_FOLLOW_THE_SYMLINK")
        self.addCleanup(outside.unlink)
        (self.root / "book/link.md").symlink_to(outside)
        self.run_review()
        output = self.report()
        for expected in ("Binary file", "1 MiB", "not UTF-8", "Symlink", "Changes without a text preview"):
            self.assertIn(expected, output)
        for excluded in ("secret-binary", "LARGE_CONTENT", "DO_NOT_FOLLOW_THE_SYMLINK"):
            self.assertNotIn(excluded, output)

    def test_paths_and_source_are_escaped_in_the_report(self):
        self.write('book/<img onerror="alert(1)">.md', '</pre><script>alert("unsafe")</script>\n')
        self.write("book/new\nline.md", "A filename containing a newline.\n")
        self.run_review()
        output = self.report()
        self.assertNotIn('<img onerror=', output)
        self.assertNotIn('<script>alert(', output)
        self.assertIn('&lt;script&gt;', output)
        self.assertIn('&lt;img onerror=&quot;', output)
        self.assertIn("A filename containing a newline.", output)

    def test_book_only_excludes_supporting_files(self):
        self.write("book/intro.md", "BOOK_MARKER\n")
        self.write("book/intro.notes.md", "NOTES_MARKER\n")
        self.write("specifications/new.md", "SPEC_MARKER\n")
        self.write("bibliography.bib", "BIB_MARKER\n")
        self.write("scripts/helper.js", "SUPPORT_MARKER\n")
        self.run_review("--book-only")
        output = self.report()
        for expected in ("BOOK_MARKER", "NOTES_MARKER", "SPEC_MARKER", "BIB_MARKER"):
            self.assertIn(expected, output)
        self.assertNotIn("SUPPORT_MARKER", output)

    def test_generated_output_is_excluded_and_tracked_output_is_protected(self):
        self.run_review("--output", "review.html")
        self.run_review("--output", "review.html")
        output = (self.root / "review.html").read_text()
        self.assertIn("No text changes to display", output)
        self.assertNotIn('data-path="review.html"', output)
        result = self.run_review("--output", "site/tracked.html", success=False)
        self.assertIn("tracked by Git", result.stderr)
        self.assertEqual((self.root / "site/tracked.html").read_text(), "Existing tracked page.\n")

    def test_mode_only_newline_only_and_rename_changes_remain_visible(self):
        self.write("book/intro.md", "BASELINE_MARKER")
        (self.root / "book/removed.md").chmod(0o755)
        self.git("mv", "site/tracked.html", "site/renamed.html")
        self.run_review()
        output = self.report()
        for expected in ("Final newline removed", "100644 → 100755", "Deleted file", "Added file", "site/renamed.html", "site/tracked.html"):
            self.assertIn(expected, output)

    def test_invalid_comparisons_fail_without_writing_a_report(self):
        for args in (("--base", "does-not-exist"), ("--context", "-1"), ("--staged", "--to", "HEAD")):
            with self.subTest(args=args):
                self.run_review(*args, success=False)
                self.assertFalse((self.root / ".local/reviews/book-changes.html").exists())


if __name__ == "__main__":
    unittest.main()
