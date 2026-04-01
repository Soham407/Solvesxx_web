#!/usr/bin/env python3
"""Task orchestrator for audit -> fix -> test -> review recovery lanes with profile failover."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import time
from pathlib import Path
from shutil import which
from typing import Any

# ── Terminal colors (ANSI, enabled on Windows via SetConsoleMode) ────────────
def _enable_ansi_windows() -> None:
    if os.name == "nt":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except Exception:
            pass

_enable_ansi_windows()

C_RESET   = "\033[0m"
C_BOLD    = "\033[1m"
C_GREEN   = "\033[92m"   # done, GO
C_RED     = "\033[91m"   # no-go, blocked_auth, blocked_env
C_YELLOW  = "\033[93m"   # needs_review, blocked_quota, blocked_transient, unknown
C_CYAN    = "\033[96m"   # stage names
C_MAGENTA = "\033[95m"   # task IDs
C_WHITE   = "\033[97m"   # profile lists

STATUS_COLORS: dict[str, str] = {
    "done":          C_GREEN,
    "queued":        C_WHITE,
    "pending":       C_WHITE,
    "in_progress":   C_CYAN,
    "needs_review":  C_YELLOW,
    "blocked_quota": C_YELLOW,
    "blocked_transient": C_YELLOW,
    "blocked_auth":  C_RED,
    "blocked_env":   C_RED,
}

VERDICT_COLORS: dict[str, str] = {
    "go":      C_GREEN,
    "no-go":   C_RED,
    "unknown": C_YELLOW,
    "fatal":   C_RED,
    "fatal — all profiles exhausted": C_RED,
}

def c(text: str, color: str) -> str:
    return f"{color}{text}{C_RESET}"

def c_status(status: str) -> str:
    return c(status, STATUS_COLORS.get(status, C_WHITE))

def c_verdict(verdict: str) -> str:
    color = VERDICT_COLORS.get(verdict.lower(), C_WHITE)
    return c(verdict.upper(), C_BOLD + color)

def c_stage(stage: str) -> str:
    return c(stage, C_CYAN)

def c_task(task_id: str) -> str:
    return c(task_id, C_MAGENTA + C_BOLD)

# ─────────────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
QUEUE_FILE = ROOT / "tasks" / "queue.yaml"
PROFILES_FILE = ROOT / "profiles.json"
OUTPUT_ROOT = ROOT / "outputs"
LOG_DIR = ROOT / "logs"
STATE_DIR = ROOT / "state"
REPORT_DIR = ROOT / "reports"
PROFILE_STATE_FILE = STATE_DIR / "profiles.json"

PROMPT_FILES = {
    "claude_audit": ROOT / "prompts" / "architect" / "claude_audit.md",
    "codex_fix": ROOT / "prompts" / "implement" / "codex_fix.md",
    "gemini_test": ROOT / "prompts" / "test" / "gemini_test.md",
    "copilot_review": ROOT / "prompts" / "review" / "copilot_review.md",
    "gemini_review": ROOT / "prompts" / "review" / "gemini_review.md",
}

DEFAULT_STAGE_TO_TOOL = {
    "claude_audit": "claude",
    "codex_fix": "codex",
    "gemini_test": "gemini",
    "copilot_review": "claude",
    "gemini_review": "gemini",
}

DEFAULT_TOOL_COMMANDS = {
    "claude": "claude",
    "codex": "codex",
    "gemini": "gemini --yolo",
    "copilot": "copilot",
}
TOOL_INVOCATION_MODE = {"claude": "stdin", "codex": "exec_arg", "gemini": "stdin", "copilot": "stdin"}
TOOL_TIMEOUT_MULTIPLIER = {"claude": 1.0, "codex": 1.0, "gemini": 3.0, "copilot": 1.0}
TOOL_ENV_VARS = {
    "claude": "AI_ORCH_CLAUDE_CMD",
    "codex": "AI_ORCH_CODEX_CMD",
    "gemini": "AI_ORCH_GEMINI_CMD",
    "copilot": "AI_ORCH_COPILOT_CMD",
}
STAGE_TOOL_OVERRIDE_ENV = "AI_ORCH_STAGE_TOOL_OVERRIDES"

EXPECTED_EVIDENCE_MARKERS = {
    "risks identified": ["merge risks", "open risks", "remaining risks", "high risk", "critical risk"],
    "file-level findings": ["file-level", "file level", "changed files", "changed_files", "file-level concerns"],
    "go / no-go recommendation": ["go / no-go", "go/no-go", "no-go", "go no-go", "no go"],
    "missing items listed": ["missing evidence", "missing gate", "must-fix", "before merge", "conditions for approval"],
}
STAGE_REQUIRED_SECTIONS = {
    "claude_audit": [
        "1. summary",
        "2. implemented",
        "3. partial",
        "4. stubbed or fake",
        "5. missing",
        "6. high-risk workflow breaks",
        "7. suspicious files",
        "8. evidence needed to certify this module",
        "9. recommended next fix",
    ],
    "codex_fix": [
        "1. changed files",
        "2. summary of fixes",
        "3. why each file changed",
        "4. tests added or updated",
        "5. remaining risks",
        "6. rollback notes if relevant",
    ],
    "gemini_test": [
        "1. tests created or updated",
        "2. test results",
        "3. evidence observed",
        "4. uncovered risks",
        "5. certification score",
        "6. if something failed, the exact failing boundary",
    ],
    "copilot_review": [
        "1. review summary",
        "2. merge risks",
        "3. file-level concerns",
        "4. commit / pr summary",
        "5. go / no-go recommendation",
        "6. missing evidence gate items",
    ],
    "gemini_review": [
        "1. review summary",
        "2. merge risks",
        "3. file-level concerns",
        "4. commit / pr summary",
        "5. go / no-go recommendation",
        "6. missing evidence gate items",
    ],
}
STAGE_REQUIRED_SECTION_ALIASES = {
    "gemini_test": {
        "6. if something failed, the exact failing boundary": [
            "6. if something failed, the exact failing boundary",
            "6. boundary failure",
        ],
    },
}
BENIGN_STDERR_MARKERS = {
    "gemini": [
        "attachconsole failed",
        "conpty_console_list_agent.js",
        "node.js v",
    ]
}

DEFAULT_COOLDOWNS = {"quota_minutes": 480, "rate_limit_minutes": 20, "transient_minutes": 10}
FAILURE_PATTERNS = {
    # auth checked first: auth errors may contain "billing" text but are auth failures, not quota
    "auth": ["unauthorized", "authentication", "invalid api key", "not logged in", "login required", "expired token", "access token", "forbidden", "401"],
    "quota": ["quota", "out of credits", "insufficient credits", "credit balance", "usage limit", "spend limit", "billing", "monthly limit", "101%", "hit your limit"],
    "rate_limit": ["rate limit", "too many requests", "429", "retry after", "resource exhausted", "try again later"],
    "env": ["createprocesswithlogonw failed", "commandnotfoundexception", "is not recognized as the name", "no such file or directory", "operation not permitted", "access is denied", "uv_spawn", "eperm", "sandbox"],
    "transient": ["timed out", "timeout", "connection reset", "network error", "socket hang up", "temporary failure", "temporarily unavailable", "econnreset", "enotfound", "eai_again", "502", "503", "504", "process killed after", "inactivity limit", "attachconsole failed"],
}
BLOCKED_STATUS_BY_FAILURE = {"quota": "blocked_quota", "rate_limit": "blocked_quota", "transient": "blocked_transient", "auth": "blocked_auth", "env": "blocked_env"}
RETRYABLE_FAILURES = {"quota", "rate_limit", "transient"}
DISABLING_FAILURES = {"auth", "env"}
VALID_STATUSES = {"queued", "pending", "in_progress", "needs_review", "done", "blocked_quota", "blocked_transient", "blocked_auth", "blocked_env"}
VALID_STAGES = tuple(PROMPT_FILES.keys())


class StageExecutionError(RuntimeError):
    def __init__(self, stage: str, kind: str, summary: str, *, attempted_profiles: list[str] | None = None, next_retry_at: dt.datetime | None = None, stage_results: list[dict[str, Any]] | None = None) -> None:
        super().__init__(summary)
        self.stage = stage
        self.kind = kind
        self.summary = summary
        self.attempted_profiles = attempted_profiles or []
        self.next_retry_at = next_retry_at
        self.stage_results = stage_results or []


def timestamp() -> str:
    return dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def ensure_runtime_dirs() -> None:
    for path in (OUTPUT_ROOT, LOG_DIR, STATE_DIR, REPORT_DIR):
        path.mkdir(parents=True, exist_ok=True)
    for tool in DEFAULT_TOOL_COMMANDS:
        (OUTPUT_ROOT / tool).mkdir(parents=True, exist_ok=True)


def log(message: str) -> None:
    plain = f"[{dt.datetime.now().isoformat(timespec='seconds')}] {message}"
    colored = f"{C_WHITE}[{dt.datetime.now().isoformat(timespec='seconds')}]{C_RESET} {message}"
    print(colored)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with (LOG_DIR / "supervisor.log").open("a", encoding="utf-8") as handle:
        handle.write(plain + "\n")


def load_structured_file(path: Path) -> Any:
    raw_text = path.read_text(encoding="utf-8")
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore
        except ImportError as exc:
            raise RuntimeError(f"{path.name} is not valid JSON. Either keep it JSON-compatible or install PyYAML.") from exc
        return yaml.safe_load(raw_text)


def load_queue() -> dict[str, Any]:
    if not QUEUE_FILE.exists():
        raise FileNotFoundError(f"Queue file not found: {QUEUE_FILE}")
    data = load_structured_file(QUEUE_FILE)
    if not isinstance(data, dict) or "tasks" not in data or not isinstance(data["tasks"], list):
        raise ValueError("Queue file must contain a top-level 'tasks' list.")
    return data


def save_queue(data: dict[str, Any]) -> None:
    QUEUE_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def validate_queue(data: dict[str, Any]) -> None:
    for index, task in enumerate(data["tasks"], start=1):
        if not isinstance(task, dict):
            raise ValueError(f"Task #{index} is not an object.")
        required = ["id", "module", "goal", "status", "lane", "inputs", "pipeline", "evidence_required"]
        missing = [field for field in required if field not in task]
        if missing:
            raise ValueError(f"Task {task.get('id', index)} is missing required fields: {', '.join(missing)}")
        if task["status"] not in VALID_STATUSES:
            raise ValueError(f"Task {task['id']} has invalid status {task['status']!r}")
        if not isinstance(task["inputs"], list) or not all(isinstance(item, str) for item in task["inputs"]):
            raise ValueError(f"Task {task['id']} must define 'inputs' as a list of strings.")
        if not isinstance(task["pipeline"], list) or not all(isinstance(item, str) for item in task["pipeline"]):
            raise ValueError(f"Task {task['id']} must define 'pipeline' as a list of stage names.")
        invalid_stages = [stage for stage in task["pipeline"] if stage not in VALID_STAGES]
        if invalid_stages:
            raise ValueError(f"Task {task['id']} uses unknown pipeline stages: {', '.join(invalid_stages)}")
        if not isinstance(task["evidence_required"], list):
            raise ValueError(f"Task {task['id']} must define 'evidence_required' as a list.")


def flatten_bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items) if items else "- (none)"


def render_template(path: Path, values: dict[str, str]) -> str:
    text = path.read_text(encoding="utf-8")
    for key, value in values.items():
        text = text.replace(f"{{{{{key}}}}}", value)
    return text


def parse_stage_tool_overrides(raw_items: list[str]) -> dict[str, str]:
    overrides: dict[str, str] = {}
    for raw in raw_items:
        if not raw:
            continue
        for item in raw.split(","):
            assignment = item.strip()
            if not assignment:
                continue
            if "=" not in assignment:
                raise ValueError(f"Invalid stage override {assignment!r}. Use stage=tool, for example codex_fix=claude.")
            stage, tool = (part.strip() for part in assignment.split("=", 1))
            if stage not in VALID_STAGES:
                raise ValueError(f"Unknown stage {stage!r}. Valid stages: {', '.join(VALID_STAGES)}")
            if tool not in DEFAULT_TOOL_COMMANDS:
                raise ValueError(f"Unknown tool {tool!r}. Valid tools: {', '.join(DEFAULT_TOOL_COMMANDS)}")
            overrides[stage] = tool
    return overrides


def format_stage_tools(stage_tools: dict[str, str]) -> str:
    return ", ".join(f"{stage}={tool}" for stage, tool in stage_tools.items())


def command_for(tool: str) -> str:
    return os.environ.get(TOOL_ENV_VARS[tool]) or DEFAULT_TOOL_COMMANDS[tool]


def build_default_profile_config() -> dict[str, Any]:
    profiles = []
    for tool in DEFAULT_TOOL_COMMANDS:
        profiles.append({"id": f"{tool}-default", "tool": tool, "command": command_for(tool), "invocation_mode": TOOL_INVOCATION_MODE[tool], "timeout_multiplier": TOOL_TIMEOUT_MULTIPLIER[tool], "enabled": True})
    stage_policies = {stage: [f"{DEFAULT_STAGE_TO_TOOL[stage]}-default"] for stage in VALID_STAGES}
    return {"profiles": profiles, "stage_policies": stage_policies, "cooldowns": dict(DEFAULT_COOLDOWNS)}


def validate_profiles_config(config: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(config, dict):
        raise ValueError("profiles.json must contain a top-level object.")
    profiles = config.get("profiles")
    if not isinstance(profiles, list) or not profiles:
        raise ValueError("profiles.json must define a non-empty 'profiles' list.")
    normalized_profiles: list[dict[str, Any]] = []
    profile_ids: set[str] = set()
    for index, profile in enumerate(profiles, start=1):
        if not isinstance(profile, dict):
            raise ValueError(f"Profile #{index} in profiles.json is not an object.")
        profile_id = str(profile.get("id", "")).strip()
        tool = str(profile.get("tool", "")).strip()
        if not profile_id:
            raise ValueError(f"Profile #{index} is missing a non-empty 'id'.")
        if profile_id in profile_ids:
            raise ValueError(f"Duplicate profile id {profile_id!r} in profiles.json.")
        if tool not in DEFAULT_TOOL_COMMANDS:
            raise ValueError(f"Profile {profile_id!r} uses unknown tool {tool!r}.")
        command = str(profile.get("command") or command_for(tool)).strip()
        if not command:
            raise ValueError(f"Profile {profile_id!r} must define a non-empty command.")
        invocation_mode = str(profile.get("invocation_mode", TOOL_INVOCATION_MODE[tool])).strip()
        if invocation_mode not in {"stdin", "exec_arg"}:
            raise ValueError(
                f"Profile {profile_id!r} has invalid invocation_mode {invocation_mode!r}."
            )
        try:
            timeout_multiplier = float(
                profile.get("timeout_multiplier", TOOL_TIMEOUT_MULTIPLIER[tool])
            )
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Profile {profile_id!r} has an invalid timeout_multiplier."
            ) from exc
        normalized_profiles.append(
            {
                "id": profile_id,
                "tool": tool,
                "command": command,
                "invocation_mode": invocation_mode,
                "timeout_multiplier": timeout_multiplier,
                "enabled": bool(profile.get("enabled", True)),
            }
        )
        profile_ids.add(profile_id)

    raw_stage_policies = config.get("stage_policies") or {
        stage: [f"{DEFAULT_STAGE_TO_TOOL[stage]}-default"] for stage in VALID_STAGES
    }
    if not isinstance(raw_stage_policies, dict):
        raise ValueError("profiles.json 'stage_policies' must be an object.")

    normalized_stage_policies: dict[str, list[str]] = {}
    for stage in VALID_STAGES:
        ordered_profiles = raw_stage_policies.get(stage)
        if ordered_profiles is None:
            raise ValueError(f"profiles.json is missing a stage policy for {stage!r}.")
        if not isinstance(ordered_profiles, list) or not all(
            isinstance(item, str) for item in ordered_profiles
        ):
            raise ValueError(
                f"Stage policy {stage!r} must be a list of profile ids."
            )
        if not ordered_profiles:
            raise ValueError(f"Stage policy {stage!r} must not be empty.")
        unknown = [profile_id for profile_id in ordered_profiles if profile_id not in profile_ids]
        if unknown:
            raise ValueError(
                f"Stage policy {stage!r} references unknown profiles: {', '.join(unknown)}"
            )
        normalized_stage_policies[stage] = list(ordered_profiles)

    cooldowns = dict(DEFAULT_COOLDOWNS)
    raw_cooldowns = config.get("cooldowns") or {}
    if not isinstance(raw_cooldowns, dict):
        raise ValueError("profiles.json 'cooldowns' must be an object if provided.")
    for key in DEFAULT_COOLDOWNS:
        if key not in raw_cooldowns:
            continue
        try:
            cooldowns[key] = int(raw_cooldowns[key])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Cooldown {key!r} must be an integer minute count.") from exc

    profiles_by_id = {profile["id"]: profile for profile in normalized_profiles}
    return {
        "profiles": normalized_profiles,
        "profiles_by_id": profiles_by_id,
        "stage_policies": normalized_stage_policies,
        "cooldowns": cooldowns,
    }


CURRENT_TASK_FILE = STATE_DIR / "current-task.json"
ALERTS_FILE = STATE_DIR / "alerts.json"
DEFAULT_MAX_RETRIES = 4
BASE_STAGE_TIMEOUT_SECONDS = int(os.environ.get("AI_ORCH_STAGE_TIMEOUT_SECONDS", "1800"))
INTER_TASK_DELAY_SECONDS = int(os.environ.get("AI_ORCH_INTER_TASK_DELAY_SECONDS", "60"))
AUTH_COOLDOWN_MINUTES = int(os.environ.get("AI_ORCH_AUTH_COOLDOWN_MINUTES", "720"))


def now_local() -> dt.datetime:
    return dt.datetime.now().replace(microsecond=0)


def parse_iso_datetime(raw_value: Any) -> dt.datetime | None:
    if not raw_value:
        return None
    if isinstance(raw_value, dt.datetime):
        value = raw_value
    elif isinstance(raw_value, str):
        try:
            value = dt.datetime.fromisoformat(raw_value)
        except ValueError:
            return None
    else:
        return None
    if value.tzinfo is not None:
        value = value.astimezone().replace(tzinfo=None)
    return value.replace(microsecond=0)


def isoformat_or_none(value: dt.datetime | None) -> str | None:
    return value.isoformat(timespec="seconds") if value else None


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def load_profiles_config(stage_tool_overrides: dict[str, str]) -> dict[str, Any]:
    if PROFILES_FILE.exists():
        raw_config = load_structured_file(PROFILES_FILE)
    else:
        raw_config = build_default_profile_config()
    config = validate_profiles_config(raw_config)
    if not stage_tool_overrides:
        return config

    profiles = list(config["profiles"])
    profiles_by_id = dict(config["profiles_by_id"])
    stage_policies = {
        stage: list(profile_ids)
        for stage, profile_ids in config["stage_policies"].items()
    }

    for stage, tool in stage_tool_overrides.items():
        matching_profiles = [
            profile["id"]
            for profile in profiles
            if profile["tool"] == tool and profile.get("enabled", True)
        ]
        if not matching_profiles:
            default_profile_id = f"{tool}-default"
            if default_profile_id not in profiles_by_id:
                profile = {
                    "id": default_profile_id,
                    "tool": tool,
                    "command": command_for(tool),
                    "invocation_mode": TOOL_INVOCATION_MODE[tool],
                    "timeout_multiplier": TOOL_TIMEOUT_MULTIPLIER[tool],
                    "enabled": True,
                }
                profiles.append(profile)
                profiles_by_id[default_profile_id] = profile
            matching_profiles = [default_profile_id]
        stage_policies[stage] = matching_profiles

    config["profiles"] = profiles
    config["profiles_by_id"] = profiles_by_id
    config["stage_policies"] = stage_policies
    return config


def load_profile_state(config: dict[str, Any]) -> dict[str, dict[str, Any]]:
    raw_state: dict[str, Any] = {}
    if PROFILE_STATE_FILE.exists():
        try:
            loaded = load_structured_file(PROFILE_STATE_FILE)
            if isinstance(loaded, dict):
                raw_state = loaded.get("profiles", loaded)
        except Exception:
            raw_state = {}

    state: dict[str, dict[str, Any]] = {}
    now = now_local()
    for profile in config["profiles"]:
        profile_id = profile["id"]
        existing = raw_state.get(profile_id, {}) if isinstance(raw_state, dict) else {}
        entry = {
            "status": existing.get("status", "ready"),
            "cooldown_until": existing.get("cooldown_until"),
            "last_error_kind": existing.get("last_error_kind"),
            "last_error_summary": existing.get("last_error_summary"),
            "last_used_at": existing.get("last_used_at"),
            "last_success_at": existing.get("last_success_at"),
            "disabled_reason": existing.get("disabled_reason"),
        }
        cooldown_until = parse_iso_datetime(entry.get("cooldown_until"))
        if entry["status"] == "cooldown" and cooldown_until and cooldown_until <= now:
            entry["status"] = "ready"
            entry["cooldown_until"] = None
        state[profile_id] = entry
    return state


def save_profile_state(state: dict[str, dict[str, Any]]) -> None:
    write_json(PROFILE_STATE_FILE, {"profiles": state})


def record_alert(kind: str, message: str, *, task_id: str | None = None, stage: str | None = None) -> None:
    payload: list[dict[str, Any]] = []
    if ALERTS_FILE.exists():
        try:
            loaded = load_structured_file(ALERTS_FILE)
            if isinstance(loaded, list):
                payload = loaded
        except Exception:
            payload = []
    payload.append(
        {
            "timestamp": isoformat_or_none(now_local()),
            "kind": kind,
            "task_id": task_id,
            "stage": stage,
            "message": message,
        }
    )
    payload = payload[-200:]
    write_json(ALERTS_FILE, payload)

def safe_slug(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-")
    return slug or "default"


def combine_previous_outputs(stage_results: list[dict[str, Any]]) -> str:
    chunks: list[str] = []
    for result in stage_results:
        if result.get("returncode") not in (0, None):
            continue
        output = str(result.get("output") or "").strip()
        if not output or output == "(prepare-only)":
            continue
        header = f"### {result['stage']} via {result['profile']}"
        chunks.append(f"{header}\n{output}")
    return "\n\n".join(chunks) if chunks else "(none)"


def build_prompt(task: dict[str, Any], stage: str, stage_results: list[dict[str, Any]]) -> str:
    values = {
        "task_id": task["id"],
        "module": task["module"],
        "goal": task.get("goal", ""),
        "inputs": flatten_bullets(task.get("inputs", [])),
        "previous_output": combine_previous_outputs(stage_results),
    }
    return render_template(PROMPT_FILES[stage], values)


def stage_file_paths(
    task: dict[str, Any],
    run_stamp: str,
    stage: str,
    profile: dict[str, Any],
    attempt_number: int,
) -> tuple[Path, Path]:
    output_dir = OUTPUT_ROOT / profile["tool"]
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = (
        f"{task['id']}-{run_stamp}-{stage}-{safe_slug(profile['id'])}"
        f"-attempt{attempt_number:02d}"
    )
    return output_dir / f"{stem}-prompt.txt", output_dir / f"{stem}.txt"


def build_stage_command(profile: dict[str, Any]) -> str:
    base_command = profile["command"]
    mode = profile["invocation_mode"]
    if mode == "exec_arg":
        # Use minimal flags — subprocess stdin is non-TTY so approval prompts never appear
        return f"{base_command} exec -"
    # All stdin-mode tools (claude, gemini) receive the prompt on stdin directly
    return base_command


def split_output_streams(output_text: str) -> tuple[str, str]:
    marker = "\n\n[STDERR]\n"
    if marker in output_text:
        stdout_text, stderr_text = output_text.split(marker, 1)
        return stdout_text, stderr_text
    if output_text.startswith("[STDERR]\n"):
        return "", output_text[len("[STDERR]\n") :]
    return output_text, ""


def stage_output_has_required_sections(stage: str, output_text: str) -> bool:
    stdout_text, _stderr_text = split_output_streams(output_text or "")
    lowered = stdout_text.lower()
    expected_sections = STAGE_REQUIRED_SECTIONS.get(stage, [])
    if not expected_sections:
        return False
    aliases_by_section = STAGE_REQUIRED_SECTION_ALIASES.get(stage, {})
    for section in expected_sections:
        aliases = aliases_by_section.get(section, [section])
        if not any(alias in lowered for alias in aliases):
            return False
    return True


def stderr_is_benign(profile: dict[str, Any], output_text: str) -> bool:
    _stdout_text, stderr_text = split_output_streams(output_text or "")
    lowered = stderr_text.lower()
    if not lowered.strip():
        return False
    markers = BENIGN_STDERR_MARKERS.get(profile["tool"], [])
    return bool(markers) and all(marker in lowered for marker in markers)


def summarize_stage_failure_kind(attempted_results: list[dict[str, Any]]) -> str:
    kinds = [str(result.get("failure_kind")) for result in attempted_results if result.get("failure_kind")]
    for kind in ("env", "auth", "quota", "rate_limit", "transient", "fatal"):
        if kind in kinds:
            return kind
    return "fatal"


INACTIVITY_TIMEOUT_SECONDS = int(os.environ.get("AI_ORCH_INACTIVITY_TIMEOUT_SECONDS", "300"))


def execute_stage_command(
    command_text: str,
    prompt_text: str,
    *,
    timeout_seconds: int,
) -> tuple[int, str]:
    """Run a stage command, killing it if no output is produced for INACTIVITY_TIMEOUT_SECONDS."""
    import threading

    inactivity_limit = INACTIVITY_TIMEOUT_SECONDS

    try:
        proc = subprocess.Popen(
            command_text,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=True,
            cwd=str(REPO_ROOT),
        )
    except OSError as exc:
        return 1, f"[STDERR]\n{exc.__class__.__name__}: {exc}"

    stdout_chunks: list[str] = []
    stderr_chunks: list[str] = []
    last_output_time = [time.monotonic()]
    killed_reason: list[str] = []

    def _read_stdout() -> None:
        assert proc.stdout is not None
        for line in proc.stdout:
            stdout_chunks.append(line)
            last_output_time[0] = time.monotonic()
        proc.stdout.close()

    def _read_stderr() -> None:
        assert proc.stderr is not None
        for line in proc.stderr:
            stderr_chunks.append(line)
            last_output_time[0] = time.monotonic()
        proc.stderr.close()

    t_out = threading.Thread(target=_read_stdout, daemon=True)
    t_err = threading.Thread(target=_read_stderr, daemon=True)
    t_out.start()
    t_err.start()

    # Write prompt and close stdin so the process knows input is done
    try:
        assert proc.stdin is not None
        proc.stdin.write(prompt_text)
        proc.stdin.close()
    except OSError:
        pass

    deadline = time.monotonic() + timeout_seconds
    while True:
        if proc.poll() is not None:
            break
        now = time.monotonic()
        if now > deadline:
            killed_reason.append(f"Process timed out after {timeout_seconds} seconds.")
            proc.kill()
            break
        idle_seconds = now - last_output_time[0]
        if idle_seconds > inactivity_limit:
            killed_reason.append(
                f"Process killed after {int(idle_seconds)}s of no output "
                f"(inactivity limit: {inactivity_limit}s)."
            )
            proc.kill()
            break
        time.sleep(1)

    t_out.join(timeout=10)
    t_err.join(timeout=10)

    returncode = proc.wait()
    stdout = "".join(stdout_chunks)
    stderr = "".join(stderr_chunks)

    if killed_reason:
        returncode = 124
        note = " ".join(killed_reason)
        parts = [part.strip() for part in [stdout, note] if part and part.strip()]
        output = "\n\n".join(parts)
        if stderr:
            output = f"{output}\n\n[STDERR]\n{stderr}" if output else f"[STDERR]\n{stderr}"
        return returncode, output

    if stderr:
        if stdout.strip():
            output = f"{stdout.rstrip()}\n\n[STDERR]\n{stderr}"
        else:
            output = f"[STDERR]\n{stderr}"
    else:
        output = stdout
    return returncode, output


def classify_stage_failure(returncode: int | None, output_text: str) -> str | None:
    stdout_text, stderr_text = split_output_streams(output_text or "")
    text = (stderr_text if returncode in (0, None) else f"{stdout_text}\n{stderr_text}").lower()
    for kind, markers in FAILURE_PATTERNS.items():
        if any(marker in text for marker in markers):
            return kind
    if returncode in (0, None):
        return None
    return "fatal"


def extract_quota_reset_time(output_text: str, *, now: dt.datetime | None = None) -> dt.datetime | None:
    match = re.search(
        r"hit your limit.*?resets?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)",
        output_text or "",
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or "0")
    meridian = match.group(3).lower()
    if meridian == "am":
        hour = 0 if hour == 12 else hour
    else:
        hour = 12 if hour == 12 else hour + 12

    base = (now or now_local()).replace(second=0, microsecond=0)
    candidate = base.replace(hour=hour, minute=minute)
    if candidate <= base:
        candidate += dt.timedelta(days=1)
    return candidate


def cooldown_deadline(kind: str, cooldowns: dict[str, int]) -> dt.datetime | None:
    now = now_local()
    if kind == "quota":
        return now + dt.timedelta(minutes=cooldowns["quota_minutes"])
    if kind == "rate_limit":
        return now + dt.timedelta(minutes=cooldowns["rate_limit_minutes"])
    if kind == "transient":
        return now + dt.timedelta(minutes=cooldowns["transient_minutes"])
    if kind == "auth":
        return now + dt.timedelta(minutes=AUTH_COOLDOWN_MINUTES)
    return None


def mark_profile_success(profile_state: dict[str, Any]) -> None:
    profile_state["status"] = "ready"
    profile_state["cooldown_until"] = None
    profile_state["last_error_kind"] = None
    profile_state["last_error_summary"] = None
    profile_state["disabled_reason"] = None
    profile_state["last_success_at"] = isoformat_or_none(now_local())


def mark_profile_failure(
    profile_state: dict[str, Any],
    kind: str,
    summary: str,
    cooldowns: dict[str, int],
    cooldown_until_override: dt.datetime | None = None,
) -> dt.datetime | None:
    profile_state["last_error_kind"] = kind
    profile_state["last_error_summary"] = summary
    if kind in {"auth", "env"}:
        profile_state["status"] = "disabled"
        profile_state["disabled_reason"] = summary
        profile_state["cooldown_until"] = None
        return None
    cooldown_until = cooldown_until_override or cooldown_deadline(kind, cooldowns)
    if cooldown_until:
        profile_state["status"] = "cooldown"
        profile_state["cooldown_until"] = isoformat_or_none(cooldown_until)
        return cooldown_until
    profile_state["status"] = "ready"
    profile_state["cooldown_until"] = None
    return None


def available_profiles_for_stage(
    stage: str,
    config: dict[str, Any],
    profile_state: dict[str, dict[str, Any]],
) -> tuple[list[str], list[dict[str, Any]], dt.datetime | None]:
    ready_profiles: list[str] = []
    skipped: list[dict[str, Any]] = []
    earliest_retry: dt.datetime | None = None
    now = now_local()

    for profile_id in config["stage_policies"][stage]:
        profile = config["profiles_by_id"][profile_id]
        state_entry = profile_state[profile_id]
        cooldown_until = parse_iso_datetime(state_entry.get("cooldown_until"))
        if state_entry.get("status") == "cooldown" and cooldown_until and cooldown_until <= now:
            state_entry["status"] = "ready"
            state_entry["cooldown_until"] = None
            cooldown_until = None
        if not profile.get("enabled", True):
            skipped.append({"profile": profile_id, "reason": "disabled_in_config"})
            continue
        if state_entry.get("status") == "disabled":
            skipped.append(
                {
                    "profile": profile_id,
                    "reason": state_entry.get("last_error_kind") or "disabled",
                    "summary": state_entry.get("last_error_summary"),
                }
            )
            continue
        if cooldown_until and cooldown_until > now:
            skipped.append(
                {
                    "profile": profile_id,
                    "reason": state_entry.get("last_error_kind") or "cooldown",
                    "cooldown_until": isoformat_or_none(cooldown_until),
                }
            )
            if earliest_retry is None or cooldown_until < earliest_retry:
                earliest_retry = cooldown_until
            continue
        ready_profiles.append(profile_id)
    return ready_profiles, skipped, earliest_retry


def execute_stage_with_failover(
    task: dict[str, Any],
    stage: str,
    run_stamp: str,
    stage_results: list[dict[str, Any]],
    config: dict[str, Any],
    profile_state: dict[str, dict[str, Any]],
    *,
    prepare_only: bool,
) -> tuple[list[dict[str, Any]], str]:
    prompt_text = build_prompt(task, stage, stage_results)
    ready_profiles, skipped_profiles, earliest_retry = available_profiles_for_stage(
        stage, config, profile_state
    )
    attempted_results: list[dict[str, Any]] = []

    if prepare_only:
        policy_profile_id = ready_profiles[0] if ready_profiles else config["stage_policies"][stage][0]
        profile = config["profiles_by_id"][policy_profile_id]
        prompt_path, output_path = stage_file_paths(task, run_stamp, stage, profile, 1)
        prompt_path.write_text(prompt_text, encoding="utf-8")
        output_path.write_text("(prepare-only)\n", encoding="utf-8")
        return (
            [
                {
                    "stage": stage,
                    "profile": profile["id"],
                    "tool": profile["tool"],
                    "prompt_path": str(prompt_path),
                    "output_path": str(output_path),
                    "ran": False,
                    "returncode": None,
                    "output": "(prepare-only)",
                    "attempt": 1,
                }
            ],
            prompt_text,
        )

    if not ready_profiles:
        disabled_kinds = {
            profile_state[item["profile"]].get("last_error_kind")
            for item in skipped_profiles
            if profile_state[item["profile"]].get("status") == "disabled"
        }
        # If any profile is cooling down, this stage is retryable even if
        # some other profiles are permanently disabled for auth/env reasons.
        if earliest_retry:
            failure_kind = "transient"
        elif "env" in disabled_kinds:
            failure_kind = "env"
        elif "auth" in disabled_kinds:
            failure_kind = "auth"
        else:
            failure_kind = "fatal"
        raise StageExecutionError(
            stage,
            failure_kind,
            f"No healthy profiles available for {stage}.",
            attempted_profiles=list(config["stage_policies"][stage]),
            next_retry_at=earliest_retry,
            stage_results=attempted_results,
        )

    for attempt_number, profile_id in enumerate(ready_profiles, start=1):
        profile = config["profiles_by_id"][profile_id]
        prompt_path, output_path = stage_file_paths(
            task, run_stamp, stage, profile, attempt_number
        )
        prompt_path.write_text(prompt_text, encoding="utf-8")
        command_text = build_stage_command(profile)
        timeout_seconds = max(
            60,
            int(BASE_STAGE_TIMEOUT_SECONDS * float(profile["timeout_multiplier"])),
        )
        returncode, output_text = execute_stage_command(
            command_text,
            prompt_text,
            timeout_seconds=timeout_seconds,
        )
        output_path.write_text(output_text, encoding="utf-8")

        result = {
            "stage": stage,
            "profile": profile["id"],
            "tool": profile["tool"],
            "prompt_path": str(prompt_path),
            "output_path": str(output_path),
            "ran": True,
            "returncode": returncode,
            "output": output_text,
            "attempt": attempt_number,
        }
        attempted_results.append(result)
        profile_state[profile_id]["last_used_at"] = isoformat_or_none(now_local())

        if returncode in (0, None) and stage_output_has_required_sections(stage, output_text):
            mark_profile_success(profile_state[profile_id])
            save_profile_state(profile_state)
            return attempted_results, prompt_text
        if returncode in (0, None) and stderr_is_benign(profile, output_text):
            failure_kind = "transient"
        else:
            failure_kind = classify_stage_failure(returncode, output_text)

        if failure_kind is None:
            if str(output_text or "").strip():
                mark_profile_success(profile_state[profile_id])
                save_profile_state(profile_state)
                return attempted_results, prompt_text
            # Empty output despite success returncode — treat as transient, try next profile
            failure_kind = "transient"

        result["failure_kind"] = failure_kind
        summary = f"{stage} failed on profile {profile_id}: {failure_kind}"
        cooldown_override = (
            extract_quota_reset_time(output_text)
            if failure_kind == "quota"
            else None
        )
        cooldown_until = mark_profile_failure(
            profile_state[profile_id],
            failure_kind,
            summary,
            config["cooldowns"],
            cooldown_until_override=cooldown_override,
        )
        save_profile_state(profile_state)
        earliest_retry = min(
            [time_point for time_point in [earliest_retry, cooldown_until] if time_point],
            default=earliest_retry,
        )
        # Continue to next profile regardless of failure_kind (including "fatal")

    aggregated_kind = summarize_stage_failure_kind(attempted_results)
    raise StageExecutionError(
        stage,
        aggregated_kind,
        f"All configured profiles failed for {stage}.",
        attempted_profiles=[item["profile"] for item in attempted_results],
        next_retry_at=earliest_retry,
        stage_results=attempted_results,
    )

def extract_numbered_section(text: str, heading: str) -> str:
    # Allow optional markdown header prefix (###, ##, #, *, **) before the section number
    pattern = re.compile(
        rf"(?ims)^[#*\s]*{re.escape(heading)}\s*\n(.*?)(?=^[#*\s]*\d+\.\s|\Z)"
    )
    match = pattern.search(text or "")
    return match.group(1).strip() if match else ""


def detect_review_verdict(review_text: str) -> str:
    section = extract_numbered_section(review_text, "5. Go / no-go recommendation")
    lowered = section.lower()
    if re.search(r"\bno[\s/-]?go\b", lowered):
        return "no-go"
    if re.search(r"\bgo\b", lowered):
        return "go"
    return "unknown"


def evaluate_evidence_gate(review_text: str) -> tuple[bool, list[str]]:
    lowered = (review_text or "").lower()
    missing = [
        label
        for label, markers in EXPECTED_EVIDENCE_MARKERS.items()
        if not any(marker in lowered for marker in markers)
    ]
    return (not missing, missing)


def latest_success_output(stage_results: list[dict[str, Any]]) -> str:
    for result in reversed(stage_results):
        if result.get("returncode") == 0 and str(result.get("output") or "").strip():
            return str(result["output"])
        if result.get("ran") is False:
            return str(result.get("output") or "")
    return ""


def build_summary_report(
    task: dict[str, Any],
    *,
    run_stamp: str,
    final_status: str,
    verdict: str,
    evidence_passed: bool,
    missing_evidence: list[str],
    stage_results: list[dict[str, Any]],
    mode: str,
    next_retry_at: dt.datetime | None = None,
    blocker_text: str = "",
) -> Path:
    summary_path = REPORT_DIR / f"{task['id']}-{run_stamp}-summary.md"
    lines = [
        f"# Task {task['id']}",
        "",
        f"- Status: `{final_status}`",
        f"- Verdict: `{verdict}`",
        f"- Retry count: `{int(task.get('retry_count', 0))}`",
        f"- Module: `{task['module']}`",
        f"- Goal: {task.get('goal', '')}",
        f"- Lane: `{task.get('lane', '')}`",
        f"- Run stamp: `{run_stamp}`",
        f"- Mode: `{mode}`",
    ]
    if task.get("blocked_stage"):
        lines.append(f"- Blocked stage: `{task['blocked_stage']}`")
    if next_retry_at:
        lines.append(f"- Next retry at: `{isoformat_or_none(next_retry_at)}`")
    lines.extend(
        [
            "",
            "## Inputs",
            *[f"- `{item}`" for item in task.get("inputs", [])],
            "",
            "## Stage Outputs",
        ]
    )
    for result in stage_results:
        lines.extend(
            [
                f"- `{result['stage']}` via `{result['profile']}` ({result['tool']})",
                f"  - Prompt: `{result['prompt_path']}`",
                f"  - Output: `{result['output_path']}`",
                f"  - Ran: `{result['ran']}`",
                f"  - Return code: `{result['returncode']}`",
            ]
        )
        if result.get("failure_kind"):
            lines.append(f"  - Failure kind: `{result['failure_kind']}`")
    lines.extend(
        [
            "",
            "## Evidence Gate",
            f"- Passed: `{str(evidence_passed).lower()}`",
        ]
    )
    if missing_evidence:
        lines.append(f"- Missing markers: {', '.join(missing_evidence)}")
    if blocker_text.strip():
        lines.extend(["", "## Blockers", blocker_text.strip()])
    summary_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return summary_path


def update_current_task_snapshot(
    task: dict[str, Any],
    *,
    status: str,
    run_stamp: str,
    verdict: str,
    stage_results: list[dict[str, Any]],
    summary_path: Path | None,
) -> None:
    payload = {
        "task_id": task["id"],
        "module": task["module"],
        "status": status,
        "verdict": verdict,
        "retry_count": int(task.get("retry_count", 0)),
        "run_stamp": run_stamp,
        "summary": str(summary_path) if summary_path else None,
        "stage_results": stage_results,
        "updated_at": isoformat_or_none(now_local()),
    }
    write_json(CURRENT_TASK_FILE, payload)


def clear_task_blockers(task: dict[str, Any]) -> None:
    for field in [
        "blocked_stage",
        "attempted_profiles",
        "next_retry_at",
        "last_error_kind",
        "last_error_summary",
        "last_review_blockers",
    ]:
        task.pop(field, None)


def finalize_review_outcome(
    task: dict[str, Any],
    review_text: str,
) -> tuple[str, bool, list[str], str]:
    verdict = detect_review_verdict(review_text)
    evidence_passed, missing_evidence = evaluate_evidence_gate(review_text)
    blocker_text = extract_numbered_section(review_text, "6. Missing evidence gate items")

    if verdict == "go" and evidence_passed:
        task["status"] = "done"
        task["completed_at"] = isoformat_or_none(now_local())
        clear_task_blockers(task)
        return verdict, evidence_passed, missing_evidence, blocker_text

    if verdict == "no-go":
        task["retry_count"] = int(task.get("retry_count", 0)) + 1
        task["last_review_blockers"] = blocker_text or review_text.strip()
        clear_task_blockers(task)
        max_retries = int(task.get("max_retries", DEFAULT_MAX_RETRIES))
        task["status"] = "queued" if int(task["retry_count"]) < max_retries else "needs_review"
        return verdict, evidence_passed, missing_evidence, blocker_text

    task["status"] = "needs_review"
    task["last_error_kind"] = "missing_evidence" if not evidence_passed else "unknown_verdict"
    task["last_error_summary"] = "Final review did not produce a certifiable go/no-go result."
    return verdict, evidence_passed, missing_evidence, blocker_text


def run_task(
    queue_data: dict[str, Any],
    task: dict[str, Any],
    config: dict[str, Any],
    profile_state: dict[str, dict[str, Any]],
    *,
    prepare_only: bool,
) -> tuple[str, Path]:
    run_stamp = timestamp()
    mode = "prepare-only" if prepare_only else "auto"
    stage_results: list[dict[str, Any]] = []
    summary_path: Path | None = None

    if not prepare_only:
        task["status"] = "in_progress"
        task["updated_at"] = isoformat_or_none(now_local())
        save_queue(queue_data)
    update_current_task_snapshot(
        task,
        status=task["status"],
        run_stamp=run_stamp,
        verdict="pending",
        stage_results=stage_results,
        summary_path=None,
    )

    try:
        for stage in task["pipeline"]:
            log(
                f"Running {c_stage(stage)} for {c_task(task['id'])} with profiles {c(', '.join(config['stage_policies'][stage]), C_WHITE)}"
            )
            attempts, _prompt_text = execute_stage_with_failover(
                task,
                stage,
                run_stamp,
                stage_results,
                config,
                profile_state,
                prepare_only=prepare_only,
            )
            stage_results.extend(attempts)
            update_current_task_snapshot(
                task,
                status=task["status"],
                run_stamp=run_stamp,
                verdict="pending",
                stage_results=stage_results,
                summary_path=summary_path,
            )
    except StageExecutionError as exc:
        stage_results.extend(exc.stage_results)
        final_status = BLOCKED_STATUS_BY_FAILURE.get(exc.kind, "needs_review")
        next_retry_at = exc.next_retry_at
        if not prepare_only:
            task["status"] = final_status
            task["blocked_stage"] = exc.stage
            task["attempted_profiles"] = exc.attempted_profiles
            task["last_error_kind"] = exc.kind
            task["last_error_summary"] = exc.summary
            if next_retry_at:
                task["next_retry_at"] = isoformat_or_none(next_retry_at)
            else:
                task.pop("next_retry_at", None)
            task["updated_at"] = isoformat_or_none(now_local())
            save_queue(queue_data)
        summary_path = build_summary_report(
            task,
            run_stamp=run_stamp,
            final_status=final_status,
            verdict=exc.kind,
            evidence_passed=False,
            missing_evidence=list(EXPECTED_EVIDENCE_MARKERS.keys()),
            stage_results=stage_results,
            mode=mode,
            next_retry_at=next_retry_at,
            blocker_text=exc.summary,
        )
        update_current_task_snapshot(
            task,
            status=final_status,
            run_stamp=run_stamp,
            verdict=exc.kind,
            stage_results=stage_results,
            summary_path=summary_path,
        )
        record_alert(exc.kind, exc.summary, task_id=task["id"], stage=exc.stage)
        return final_status, summary_path

    review_text = latest_success_output(stage_results)
    if prepare_only:
        summary_path = build_summary_report(
            task,
            run_stamp=run_stamp,
            final_status=task["status"],
            verdict="prepare-only",
            evidence_passed=False,
            missing_evidence=list(EXPECTED_EVIDENCE_MARKERS.keys()),
            stage_results=stage_results,
            mode=mode,
        )
        update_current_task_snapshot(
            task,
            status=task["status"],
            run_stamp=run_stamp,
            verdict="prepare-only",
            stage_results=stage_results,
            summary_path=summary_path,
        )
        return task["status"], summary_path

    final_stage = task["pipeline"][-1] if task.get("pipeline") else ""
    if final_stage.endswith("review"):
        verdict, evidence_passed, missing_evidence, blocker_text = finalize_review_outcome(
            task, review_text
        )
    else:
        verdict = "unknown"
        evidence_passed = False
        missing_evidence = list(EXPECTED_EVIDENCE_MARKERS.keys())
        blocker_text = "Final pipeline stage was not a review stage, so the task requires manual certification."
        task["status"] = "needs_review"
        task["last_error_kind"] = "missing_review"
        task["last_error_summary"] = blocker_text

    task["updated_at"] = isoformat_or_none(now_local())
    save_queue(queue_data)
    summary_path = build_summary_report(
        task,
        run_stamp=run_stamp,
        final_status=task["status"],
        verdict=verdict,
        evidence_passed=evidence_passed,
        missing_evidence=missing_evidence,
        stage_results=stage_results,
        mode=mode,
        next_retry_at=parse_iso_datetime(task.get("next_retry_at")),
        blocker_text=blocker_text,
    )
    update_current_task_snapshot(
        task,
        status=task["status"],
        run_stamp=run_stamp,
        verdict=verdict,
        stage_results=stage_results,
        summary_path=summary_path,
    )

    if task["status"] in {"blocked_quota", "blocked_transient", "blocked_auth", "blocked_env"}:
        record_alert(task["status"], task.get("last_error_summary", "Task blocked"), task_id=task["id"], stage=task.get("blocked_stage"))
    elif task["status"] == "needs_review":
        record_alert("needs_review", task.get("last_error_summary", "Task needs review"), task_id=task["id"])

    return task["status"], summary_path

def find_task(queue_data: dict[str, Any], task_id: str) -> dict[str, Any] | None:
    for task in queue_data["tasks"]:
        if task.get("id") == task_id:
            return task
    return None


def task_is_ready(task: dict[str, Any]) -> bool:
    status = task.get("status")
    if status in {"queued", "pending"}:
        return True
    if status in {"blocked_quota", "blocked_transient"}:
        next_retry_at = parse_iso_datetime(task.get("next_retry_at"))
        return next_retry_at is None or next_retry_at <= now_local()
    return False


def next_task(queue_data: dict[str, Any], requested_task_id: str | None = None) -> dict[str, Any] | None:
    if requested_task_id:
        task = find_task(queue_data, requested_task_id)
        if not task:
            return None
        if task.get("status") in {"blocked_quota", "blocked_transient"} and not task_is_ready(task):
            return None
        return task
    for task in queue_data["tasks"]:
        if task_is_ready(task):
            return task
    return None


def recover_interrupted_tasks(queue_data: dict[str, Any]) -> list[str]:
    recovered: list[str] = []
    for task in queue_data["tasks"]:
        if task.get("status") != "in_progress":
            continue
        task["status"] = "queued"
        task["updated_at"] = isoformat_or_none(now_local())
        task["last_error_kind"] = "interrupted_run"
        task["last_error_summary"] = "Recovered after the previous supervisor invocation exited unexpectedly."
        recovered.append(str(task.get("id", "")))
    if recovered and CURRENT_TASK_FILE.exists():
        try:
            snapshot = load_structured_file(CURRENT_TASK_FILE)
            if isinstance(snapshot, dict) and snapshot.get("task_id") in recovered:
                snapshot["status"] = "queued"
                snapshot["verdict"] = "interrupted_run"
                snapshot["updated_at"] = isoformat_or_none(now_local())
                write_json(CURRENT_TASK_FILE, snapshot)
        except Exception:
            pass
    return recovered


def command_init(_args: argparse.Namespace) -> int:
    ensure_runtime_dirs()
    if not PROFILES_FILE.exists():
        write_json(PROFILES_FILE, build_default_profile_config())
        print(f"Created {PROFILES_FILE}")
    else:
        print(f"Profiles file already exists: {PROFILES_FILE}")
    print("Runtime directories are ready.")
    return 0


def command_validate(args: argparse.Namespace) -> int:
    ensure_runtime_dirs()
    queue_data = load_queue()
    validate_queue(queue_data)
    stage_overrides = parse_stage_tool_overrides(
        [os.environ.get(STAGE_TOOL_OVERRIDE_ENV, ""), *args.stage_tool]
    )
    config = load_profiles_config(stage_overrides)
    save_profile_state(load_profile_state(config))
    print("Queue OK")
    print("Profiles OK")
    print(f"Stage policies: {format_stage_tools({stage: config['profiles_by_id'][profiles[0]]['tool'] for stage, profiles in config['stage_policies'].items()})}")
    return 0


def command_status(args: argparse.Namespace) -> int:
    ensure_runtime_dirs()
    queue_data = load_queue()
    validate_queue(queue_data)
    stage_overrides = parse_stage_tool_overrides(
        [os.environ.get(STAGE_TOOL_OVERRIDE_ENV, ""), *args.stage_tool]
    )
    config = load_profiles_config(stage_overrides)
    profile_state = load_profile_state(config)
    save_profile_state(profile_state)

    counts: dict[str, int] = {}
    for task in queue_data["tasks"]:
        counts[task["status"]] = counts.get(task["status"], 0) + 1

    print(c("Queue status", C_BOLD))
    for status in sorted(counts):
        print(f"  {c_status(status)}: {counts[status]}")

    upcoming = next_task(queue_data)
    if upcoming:
        print(f"- next: {upcoming['id']} ({upcoming['status']})")
    else:
        print("- next: none")

    blocked_tasks = [
        task for task in queue_data["tasks"] if task["status"] in {"blocked_quota", "blocked_transient", "blocked_auth", "blocked_env"}
    ]
    if blocked_tasks:
        print("Blocked tasks")
        for task in blocked_tasks:
            print(
                f"- {task['id']}: {task['status']}"
                f" stage={task.get('blocked_stage', '-') }"
                f" next_retry={task.get('next_retry_at', '-') }"
            )

    print("Profiles")
    for profile in config["profiles"]:
        state = profile_state[profile["id"]]
        detail = state.get("cooldown_until") or state.get("disabled_reason") or ""
        suffix = f" ({detail})" if detail else ""
        print(f"- {profile['id']}: {state['status']}{suffix}")
    return 0


def command_next(args: argparse.Namespace) -> int:
    queue_data = load_queue()
    validate_queue(queue_data)
    task = next_task(queue_data, args.task)
    if not task:
        print("No eligible task found.")
        return 1
    print(json.dumps(task, indent=2))
    return 0


def command_run(args: argparse.Namespace) -> int:
    ensure_runtime_dirs()
    queue_data = load_queue()
    validate_queue(queue_data)
    recovered = recover_interrupted_tasks(queue_data)
    if recovered:
        save_queue(queue_data)
        log(f"Recovered interrupted tasks back to queued: {', '.join(recovered)}")

    stage_overrides = parse_stage_tool_overrides(
        [os.environ.get(STAGE_TOOL_OVERRIDE_ENV, ""), *args.stage_tool]
    )
    config = load_profiles_config(stage_overrides)
    profile_state = load_profile_state(config)
    save_profile_state(profile_state)

    if args.task and not find_task(queue_data, args.task):
        raise ValueError(f"Task {args.task!r} not found in queue.")

    processed_any = False
    while True:
        task = next_task(queue_data, args.task)
        if not task:
            if args.task:
                requested = find_task(queue_data, args.task)
                if requested and requested.get("status") in {"blocked_quota", "blocked_transient"}:
                    next_retry_at = parse_iso_datetime(requested.get("next_retry_at"))
                    suffix = (
                        f" Next retry: {isoformat_or_none(next_retry_at)}"
                        if next_retry_at
                        else ""
                    )
                    print(c(f"Task {args.task} is not eligible to run yet.{suffix}", C_YELLOW))
                    return 0
            blocked = [t for t in queue_data["tasks"] if t["status"] in {"blocked_quota", "blocked_transient", "blocked_auth", "blocked_env"}]
            retryable_blocked = [t for t in blocked if t["status"] in {"blocked_quota", "blocked_transient"}]
            if not processed_any:
                if blocked:
                    earliest = min(
                        (parse_iso_datetime(t.get("next_retry_at")) for t in retryable_blocked if t.get("next_retry_at")),
                        default=None,
                    )
                    suffix = f" Earliest retry: {isoformat_or_none(earliest)}" if earliest else ""
                    print(c(f"No eligible tasks to run. {len(blocked)} task(s) are still blocked.{suffix}", C_YELLOW))
                else:
                    print(c("No eligible tasks to run.", C_YELLOW))
            else:
                if blocked:
                    earliest = min(
                        (parse_iso_datetime(t.get("next_retry_at")) for t in retryable_blocked if t.get("next_retry_at")),
                        default=None,
                    )
                    suffix = f" Earliest retry: {isoformat_or_none(earliest)}" if earliest else ""
                    print(c(f"Queue paused — {len(blocked)} task(s) still blocked.{suffix}", C_YELLOW))
                else:
                    print(c("Queue run complete. ✓", C_GREEN + C_BOLD))
                    record_alert("queue_complete", "Queue run complete.")
            return 0

        processed_any = True
        try:
            status, summary_path = run_task(
                queue_data,
                task,
                config,
                profile_state,
                prepare_only=args.prepare_only,
            )
        except KeyboardInterrupt:
            if task.get("status") == "in_progress":
                task["status"] = "queued"
                task["updated_at"] = isoformat_or_none(now_local())
                save_queue(queue_data)
            print(c(f"\nInterrupted. Task {task['id']} reset to queued.", C_YELLOW))
            return 1

        print(
            f"Task {c_task(task['id'])} completed with status {c_status(status)}. Summary: {summary_path}"
        )

        if args.prepare_only:
            return 0
        if args.task and status not in {"queued", "pending"}:
            return 0

        try:
            if INTER_TASK_DELAY_SECONDS > 0:
                log(
                    f"Waiting {INTER_TASK_DELAY_SECONDS}s before next task to avoid rate limits..."
                )
                time.sleep(INTER_TASK_DELAY_SECONDS)
        except KeyboardInterrupt:
            print("\nInterrupted during inter-task delay.")
            return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Create runtime directories and default profiles.json")
    init_parser.set_defaults(func=command_init)

    validate_parser = subparsers.add_parser("validate", help="Validate queue and profiles configuration")
    validate_parser.add_argument(
        "--stage-tool",
        action="append",
        default=[],
        help="Override a stage to use a different tool, e.g. codex_fix=claude",
    )
    validate_parser.set_defaults(func=command_validate)

    status_parser = subparsers.add_parser("status", help="Show queue and profile status")
    status_parser.add_argument(
        "--stage-tool",
        action="append",
        default=[],
        help="Override a stage to use a different tool, e.g. codex_fix=claude",
    )
    status_parser.set_defaults(func=command_status)

    next_parser = subparsers.add_parser("next", help="Show the next eligible task")
    next_parser.add_argument("--task", help="Inspect a specific task id instead of the next eligible task")
    next_parser.set_defaults(func=command_next)

    run_parser = subparsers.add_parser("run", help="Run the queue with profile failover")
    run_parser.add_argument("--task", help="Run a specific task id")
    run_parser.add_argument(
        "--prepare-only",
        action="store_true",
        help="Render prompt and output files without launching the external CLI commands",
    )
    run_parser.add_argument(
        "--stage-tool",
        action="append",
        default=[],
        help="Override a stage to use a different tool, e.g. codex_fix=claude",
    )
    run_parser.set_defaults(func=command_run)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
