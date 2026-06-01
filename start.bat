@echo off
chcp 65001 >nul
echo.
echo  ██████╗██████╗ ███████╗ █████╗       █████╗  ██████╗████████╗██╗ ██████╗ ███╗  ██╗
echo ██╔════╝██╔══██╗██╔════╝██╔══██╗     ██╔══██╗██╔════╝╚══██╔══╝██║██╔═══██╗████╗ ██║
echo ██║     ██████╔╝█████╗  ███████║     ███████║██║        ██║   ██║██║   ██║██╔██╗██║
echo ██║     ██╔══██╗██╔══╝  ██╔══██║     ██╔══██║██║        ██║   ██║██║   ██║██║╚████║
echo ╚██████╗██║  ██║███████╗██║  ██║     ██║  ██║╚██████╗   ██║   ██║╚██████╔╝██║ ╚███║
echo  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝     ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚══╝
echo.
echo  Tableau de bord des revenus pour createurs de contenu
echo  ======================================================
echo.

REM --- Verifier Python ---
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Python n'est pas installe ou pas dans le PATH.
    echo  Telechargez Python 3.11+ sur https://python.org
    echo  Cochez "Add Python to PATH" lors de l'installation.
    pause
    exit /b 1
)

echo  [OK] Python detecte

REM --- Creer le fichier .env si absent ---
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo  [INFO] Fichier .env cree depuis .env.example
        echo  [INFO] Editez .env pour ajouter vos cles API
    )
)

REM --- Installer les dependances ---
echo  [INFO] Installation des dependances Python...
pip install -r requirements.txt -q --disable-pip-version-check
if errorlevel 1 (
    echo  [ERREUR] Echec de l'installation des dependances.
    echo  Essayez: pip install -r requirements.txt
    pause
    exit /b 1
)
echo  [OK] Dependances installees

REM --- Lancer le navigateur apres 2 secondes ---
echo  [INFO] Demarrage du serveur sur http://localhost:8000
echo  [INFO] Le navigateur va s'ouvrir automatiquement...
echo.
echo  Appuyez sur Ctrl+C pour arreter l'application.
echo.
timeout /t 2 /nobreak >nul
start http://localhost:8000

REM --- Demarrer FastAPI ---
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
