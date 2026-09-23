"""Root conftest: loads `py.py` in isolation for the test suite.

`py.py` lives at the repo root (not inside a package), so tests import it via
importlib using its file path rather than `import py` — `py` is also the name
of a real PyPI package that pytest's own internals rely on, and we do not
want a plain `sys.path` insertion to shadow it for the whole test session.
"""
import importlib.util
import os
import sys
import tempfile

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))


def _load_py_module():
    module_name = "promptx_rules_engine"
    if module_name in sys.modules:
        return sys.modules[module_name]

    # Ensure no API key (from a real environment or a repo .env file) causes
    # py.py to configure a live Gemini client at import time. Tests must run
    # fully offline regardless of the developer's local environment.
    old_key = os.environ.pop("GEMINI_API_KEY", None)
    old_cwd = os.getcwd()
    try:
        # py.py falls back to reading a local .env file (relative to the
        # current working directory — see its `os.path.exists(".env")`
        # check) when the env var is absent. Rather than touching the
        # developer's real .env in the repo root (renaming/moving a file
        # that may hold a live credential is never safe: a hard kill
        # between rename-out and rename-back would strand it), we chdir
        # into a fresh empty temporary directory for the duration of the
        # import. py.py itself is loaded by absolute path via
        # spec_from_file_location below, so it does not need cwd to be the
        # repo root to import correctly — only its own `os.path.exists(".env")`
        # check cares about cwd, and an empty temp directory guarantees
        # that check is False without reading, moving, or writing any real
        # file in the repo.
        with tempfile.TemporaryDirectory() as empty_dir:
            try:
                os.chdir(empty_dir)
                spec = importlib.util.spec_from_file_location(
                    module_name, os.path.join(REPO_ROOT, "py.py")
                )
                module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = module
                spec.loader.exec_module(module)
            finally:
                # Must leave the temp dir before the TemporaryDirectory
                # context manager tries to remove it — on Windows a
                # directory that is still the process's cwd is locked and
                # cannot be rmdir'd, which would otherwise raise here.
                os.chdir(old_cwd)
    finally:
        os.chdir(old_cwd)
        if old_key is not None:
            os.environ["GEMINI_API_KEY"] = old_key

    return module


# Load once at collection time and expose it under a stable name tests can
# import via `from conftest import rules_engine`, or re-import through
# sys.modules["promptx_rules_engine"].
rules_engine = _load_py_module()

# Hard guarantee, not just convention: the module-level Gemini client must
# never be configured for this test session, regardless of how it was
# imported or what the developer's environment looks like. The autouse
# fixture in tests/test_rules_engine.py additionally forces this per-test,
# but this assertion fails loudly at collection time if the isolation above
# is ever broken (e.g. by a future edit that stops popping GEMINI_API_KEY).
assert rules_engine.client is None, (
    "py.py configured a live Gemini client during test import — "
    "GEMINI_API_KEY isolation in conftest.py is broken"
)
