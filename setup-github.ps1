# Automated GitHub Setup Script for Breached Demo
# Run this script from PowerShell in the project directory.
# This script only sets up LOCAL git (init/add/commit). It does not create the GitHub repo.

Write-Host "=== Breached Demo - Git Setup ===" -ForegroundColor Cyan
Write-Host ""

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "ERROR: Git is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Install Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

Write-Host "Git found." -ForegroundColor Green

if (-not (Test-Path ".git")) {
    Write-Host "Initializing repository..." -ForegroundColor Yellow
    git init | Out-Host
} else {
    Write-Host "Repository already initialized." -ForegroundColor Green
}

Write-Host "Staging files..." -ForegroundColor Yellow
git add . | Out-Host

$porcelain = git status --porcelain
if ($porcelain) {
    Write-Host "Committing..." -ForegroundColor Yellow
    git commit -m "Initial commit: breached-demo" | Out-Host
} else {
    Write-Host "No changes to commit." -ForegroundColor Green
}

Write-Host ""
Write-Host "Next: create a GitHub repo, then run:" -ForegroundColor Cyan
Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
Write-Host "  git branch -M main"
Write-Host "  git push -u origin main"
