#!/usr/bin/env python3
import os
import sys
import subprocess
import webbrowser

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)

    # Check if venv exists
    venv_python = os.path.join(root_dir, "venv", "bin", "python3")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    # Ensure frontend is built
    dist_index = os.path.join(root_dir, "frontend", "dist", "index.html")
    if not os.path.exists(dist_index):
        print("🔨 Construction du frontend React...")
        subprocess.run(["npm", "run", "build"], cwd=os.path.join(root_dir, "frontend"), check=True)

    print("\n🚀 Démarrage de Super U Ticket Manager sur http://localhost:8000")
    print("👉 Ouvrez http://localhost:8000 dans votre navigateur\n")

    cmd = [
        venv_python,
        "-m",
        "uvicorn",
        "backend.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000"
    ]
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\nArrêt du serveur.")

if __name__ == "__main__":
    main()
