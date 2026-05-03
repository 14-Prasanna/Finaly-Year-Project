"""
CyberShield - Test Runner
=========================
Runs all pytest tests with Allure reporting and HTML report.

Usage (from backend/ directory):
    python scripts/run_tests.py

Outputs:
    allure-results/   - raw Allure result JSON files
    allure-report/    - generated Allure HTML report
    reports/          - pytest-HTML reports
    logs/             - app + error logs
"""

import os
import sys
import subprocess
import shutil
import webbrowser
from datetime import datetime

BACKEND_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS_DIR    = os.path.join(BACKEND_DIR, "tests")
RESULTS_DIR  = os.path.join(BACKEND_DIR, "allure-results")
REPORT_DIR   = os.path.join(BACKEND_DIR, "allure-report")
REPORTS_DIR  = os.path.join(BACKEND_DIR, "reports")

os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(REPORT_DIR,  exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
html_report = os.path.join(REPORTS_DIR, f"cybershield_test_{timestamp}.html")

print("=" * 60)
print("  CyberShield -- Running Test Suite")
print("=" * 60)
print(f"  Timestamp  : {timestamp}")
print(f"  Tests dir  : {TESTS_DIR}")
print(f"  Allure dir : {RESULTS_DIR}")
print(f"  HTML report: {html_report}")
print("=" * 60, "\n")

# Step 1: Run pytest (from backend/ so pytest.ini is found)
cmd = [
    sys.executable, "-m", "pytest",
    "tests/tests_allure.py",
    "-v",
    "--tb=short",
    f"--alluredir={RESULTS_DIR}",
    "--clean-alluredir",
    f"--html={html_report}",
    "--self-contained-html",
]

print(">> Running pytest...\n")
result = subprocess.run(cmd, cwd=BACKEND_DIR)

print("\n" + "=" * 60)
if result.returncode == 0:
    print("  [PASS] All tests PASSED")
elif result.returncode == 1:
    print("  [FAIL] Some tests FAILED (see above)")
else:
    print(f"  [WARN] pytest exited with code {result.returncode}")
print("=" * 60)

# Step 2: Generate Allure HTML report
allure_exe = shutil.which("allure")
if allure_exe:
    print("\n>> Generating Allure HTML report...")
    gen = subprocess.run(
        ["allure", "generate", RESULTS_DIR, "--clean", "-o", REPORT_DIR],
        cwd=BACKEND_DIR
    )
    if gen.returncode == 0:
        index = os.path.join(REPORT_DIR, "index.html")
        print(f"  [OK] Allure report -> {index}")
        webbrowser.open(f"file:///{index}")
    else:
        print("  [WARN] allure generate failed")
        print("     Run: allure serve allure-results")
else:
    print("\n  [INFO] allure CLI not found.")
    print("     Install: https://github.com/allure-framework/allure2/releases")
    print("     Then run: allure serve allure-results")
    print(f"\n  [OK] Raw results -> {RESULTS_DIR}")

# Step 3: Open pytest-HTML report
if os.path.exists(html_report):
    print(f"\n  [OK] pytest-HTML report -> {html_report}")
    webbrowser.open(f"file:///{html_report}")

print("\n  Output files:")
print(f"     Allure results : allure-results/")
print(f"     Allure report  : allure-report/")
print(f"     pytest HTML    : reports/cybershield_test_{timestamp}.html")
print(f"     App logs       : logs/")
print()
sys.exit(result.returncode)
