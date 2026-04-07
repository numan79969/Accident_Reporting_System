import subprocess
import sys
import os


def install_requirements():
    requirements_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "requirements.txt")
    if not os.path.exists(requirements_path):
        print("requirements.txt not found, skipping dependency installation.")
        return
    print("Installing dependencies from requirements.txt...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_path, "-q"])
    print("All dependencies installed successfully.")
