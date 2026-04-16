# Simple Git Setup Script
# This script initializes git, adds files, and commits them

Write-Host "Setting up Git repository..." -ForegroundColor Cyan

# Initialize git
if (-not (Test-Path .git)) {
    git init
}

# Add all files
git add .

# Commit
$commitMsg = "Initial commit: Breached night phase moderation app"
git commit -m $commitMsg

Write-Host "`nLocal git repository ready!" -ForegroundColor Green
Write-Host "`nTo push to GitHub:" -ForegroundColor Yellow
Write-Host "1. Create a repo at: https://github.com/new" -ForegroundColor White
Write-Host "2. Run: git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git" -ForegroundColor White
Write-Host "3. Run: git branch -M main" -ForegroundColor White
Write-Host "4. Run: git push -u origin main" -ForegroundColor White
