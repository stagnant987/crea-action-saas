@echo off
chcp 65001 > nul
title CREA ACTION - Déploiement automatique
color 0B

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   🚀 CREA ACTION - Déploiement automatique   ║
echo  ╚══════════════════════════════════════════════╝
echo.

SET PATH=%PATH%;C:\Program Files\GitHub CLI

:: ─── ÉTAPE 1 : GitHub Login ───────────────────────────────────────────────────
echo  [1/4] Connexion GitHub...
echo  ⚡ Une page va s'ouvrir dans ton navigateur.
echo  ⚡ Clique sur "Authorize GitHub CLI" et c'est tout.
echo.
gh auth login --hostname github.com --git-protocol https --web
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ❌ Erreur de connexion GitHub. Réessaie.
    pause
    exit /b 1
)
echo  ✅ Connecté à GitHub !
echo.

:: ─── ÉTAPE 2 : Créer le repo GitHub ──────────────────────────────────────────
echo  [2/4] Création du dépôt GitHub...
cd /d "%~dp0"
gh repo create crea-action-saas --public --source=. --remote=origin --push --description "Auto Money Studio - SaaS de gestion de revenus créateurs"
if %ERRORLEVEL% NEQ 0 (
    echo  ⚠️  Le repo existe peut-être déjà. Tentative de push direct...
    git remote add origin https://github.com/%GITHUB_USER%/crea-action-saas.git 2>nul
    git branch -M main
    git push -u origin main
)
echo  ✅ Code envoyé sur GitHub !
echo.

:: ─── ÉTAPE 3 : Railway CLI + Login ───────────────────────────────────────────
echo  [3/4] Connexion Railway (hébergement)...
echo  ⚡ Une autre page va s'ouvrir - connecte-toi avec GitHub.
echo.
call npx @railway/cli login --browserless
if %ERRORLEVEL% NEQ 0 (
    call npx @railway/cli login
)
echo  ✅ Connecté à Railway !
echo.

:: ─── ÉTAPE 4 : Déployer sur Railway ──────────────────────────────────────────
echo  [4/4] Déploiement en cours...
call npx @railway/cli init --name "crea-action-saas"
call npx @railway/cli up
echo.

:: ─── Variables d'environnement ────────────────────────────────────────────────
echo  ══════════════════════════════════════════════════════
echo  ⚠️  DERNIERE ETAPE : Ajouter ta clé Anthropic
echo  ══════════════════════════════════════════════════════
echo.
echo  1. Va sur https://console.anthropic.com/settings/keys
echo  2. Crée une clé API (sk-ant-...)
echo  3. Copie-la
echo.
set /p APIKEY="  Colle ta clé Anthropic ici : "
if not "%APIKEY%"=="" (
    call npx @railway/cli variables set ANTHROPIC_API_KEY=%APIKEY%
    call npx @railway/cli variables set NODE_ENV=production
    call npx @railway/cli variables set PORT=3001
    echo  ✅ Clé configurée !
)
echo.

:: ─── Obtenir l'URL ────────────────────────────────────────────────────────────
echo  ══════════════════════════════════════════════════════
echo  🌍 Génération de ton URL publique...
echo  ══════════════════════════════════════════════════════
call npx @railway/cli domain
echo.
echo  ══════════════════════════════════════════════════════
echo  ✅ DÉPLOIEMENT TERMINÉ !
echo  ══════════════════════════════════════════════════════
echo  Ton site est en ligne. Vérifie le dashboard Railway :
echo  https://railway.app/dashboard
echo  ══════════════════════════════════════════════════════
echo.
pause
