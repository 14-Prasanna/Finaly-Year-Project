"""
CyberShield — Centralized Logger
=================================
Outputs to BOTH console and rotating log files.

Log files created in:  backend/logs/
  cybershield.log  — all levels (DEBUG+)
  errors.log       — ERROR + CRITICAL only

Usage:
    from logger import get_logger
    log = get_logger(__name__)

    log.debug("Raw debug detail")
    log.info("Prediction requested")
    log.warning("Model fallback used")
    log.error("DB connection failed: %s", str(e))
    log.critical("Application crash: %s", str(e))
"""

import logging
import os
import sys
import traceback
from logging.handlers import RotatingFileHandler
from datetime import datetime

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR  = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# ── Format strings ────────────────────────────────────────────────────────────
FILE_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)-25s | "
    "%(filename)s:%(lineno)d | %(message)s"
)
CONSOLE_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FMT       = "%Y-%m-%d %H:%M:%S"

# ── ANSI colours for console ───────────────────────────────────────────────────
LEVEL_COLOURS = {
    "DEBUG":    "\033[36m",   # Cyan
    "INFO":     "\033[32m",   # Green
    "WARNING":  "\033[33m",   # Yellow
    "ERROR":    "\033[31m",   # Red
    "CRITICAL": "\033[35m",   # Magenta
}
RESET = "\033[0m"

class ColouredFormatter(logging.Formatter):
    """Adds ANSI colour to levelname in console output."""
    def format(self, record):
        colour = LEVEL_COLOURS.get(record.levelname, "")
        record.levelname = f"{colour}{record.levelname}{RESET}"
        return super().format(record)


# ── Registry (avoid duplicate handlers) ───────────────────────────────────────
_loggers: dict = {}


def get_logger(name: str = "cybershield") -> logging.Logger:
    """
    Return a logger with:
      • Coloured console output  (INFO and above)
      • cybershield.log file     (DEBUG and above, 5 MB × 3)
      • errors.log file          (ERROR and above, 2 MB × 2)
    """
    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False          # Don't bubble to root logger

    # ── 1. Console — coloured, INFO+ ─────────────────────────────────────────
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.DEBUG)
    console.setFormatter(ColouredFormatter(CONSOLE_FORMAT, datefmt=DATE_FMT))

    # ── 2. File — all levels, rotating ───────────────────────────────────────
    app_log = RotatingFileHandler(
        os.path.join(LOG_DIR, "cybershield.log"),
        maxBytes=5 * 1024 * 1024,   # 5 MB
        backupCount=3,
        encoding="utf-8",
    )
    app_log.setLevel(logging.DEBUG)
    app_log.setFormatter(logging.Formatter(FILE_FORMAT, datefmt=DATE_FMT))

    # ── 3. File — errors only, rotating ──────────────────────────────────────
    err_log = RotatingFileHandler(
        os.path.join(LOG_DIR, "errors.log"),
        maxBytes=2 * 1024 * 1024,   # 2 MB
        backupCount=2,
        encoding="utf-8",
    )
    err_log.setLevel(logging.ERROR)
    err_log.setFormatter(logging.Formatter(FILE_FORMAT, datefmt=DATE_FMT))

    logger.addHandler(console)
    logger.addHandler(app_log)
    logger.addHandler(err_log)

    _loggers[name] = logger
    logger.info("[OK] Logger '%s' ready -- logs -> %s", name, LOG_DIR)
    return logger


# ── Helpers ───────────────────────────────────────────────────────────────────
def request_log(log: logging.Logger, method: str, path: str,
                status: int, user: str = "anonymous"):
    """Log an HTTP request in a structured one-liner."""
    level = logging.WARNING if status >= 400 else logging.INFO
    log.log(level, "HTTP %s %s → %d  [user=%s]", method, path, status, user)


def prediction_log(log: logging.Logger, prediction: str,
                   risk_level: str, risk_score: int, user: str = "anonymous"):
    """Log a prediction result."""
    log.info(
        "[PREDICTION] user=%-15s | %-30s | risk=%-8s | score=%d/100",
        user, prediction, risk_level, risk_score
    )


def exc_log(log: logging.Logger, msg: str, exc: Exception):
    """Log an exception with full traceback to the error file."""
    log.error("%s: %s", msg, exc)
    log.debug("Traceback:\n%s", traceback.format_exc())


# ── Module-level default logger ───────────────────────────────────────────────
log = get_logger("cybershield.app")
