import importlib
import os
import sys
from pathlib import Path


def log(message: str) -> None:
    print(message, flush=True)

def setup_runtime() -> tuple[Path, str, str]:
    main_py_path = Path(os.environ["AKYA_MAIN_PY"]).resolve()
    task = os.environ.get("AKYA_TASK", "").strip()
    input_mode = os.environ.get("AKYA_INPUT_MODE", "type").strip().lower() or "type"
    project_root = main_py_path.parent

    os.chdir(project_root)
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    os.environ.setdefault("AKYA_ENABLE_TTS", "0")
    os.environ.setdefault("AKYA_SKIP_GREETING", "1")
    os.environ.setdefault("AKYA_RUN_ONCE", "1")
    return main_py_path, task, input_mode


def main() -> int:
    _, task, input_mode = setup_runtime()

    if not task:
        log("No task was provided to the Akya bridge.")
        return 1

    try:
        akya_main = importlib.import_module("main")
        akya_main.run_once(input_mode=input_mode, preset_task=task)
        return 0
    except Exception as error:
        log(f"Akya bridge failed: {error}")
        raise


if __name__ == "__main__":
    raise SystemExit(main())
