# Security Project Management Automation Script
# Quick commands for managing the Security Audit 2025 project

Write-Host "=== Security Audit Project Management ===" -ForegroundColor Green

# Function to assign issues to team members
function Assign-SecurityIssues {
    Write-Host "Assigning security issues to team members..." -ForegroundColor Cyan

    # Replace these with actual GitHub usernames
    $seniorBackend = "senior-developer-username"
    $frontendDev = "frontend-developer-username"
    $devopsEngineer = "devops-engineer-username"
    $projectLead = "project-lead-username"

    # Critical & High Priority (Backend focus)
    gh issue edit 79 --add-assignee $seniorBackend  # Secret Keys
    gh issue edit 81 --add-assignee $seniorBackend  # SQL Injection
    gh issue edit 82 --add-assignee $seniorBackend  # Token Exposure
    gh issue edit 83 --add-assignee $seniorBackend  # Rate Limiting

    # Frontend Security Issues
    gh issue edit 80 --add-assignee $frontendDev    # JWT Storage
    gh issue edit 84 --add-assignee $frontendDev    # XSS Prevention
    gh issue edit 86 --add-assignee $frontendDev    # Console Logging

    # Infrastructure Issues
    gh issue edit 85 --add-assignee $devopsEngineer # CORS Config

    # Documentation & Overview
    gh issue edit 87 --add-assignee $projectLead    # Security Overview

    Write-Host "All security issues assigned!" -ForegroundColor Green
}

# Function to create milestones
function Create-SecurityMilestones {
    Write-Host "Creating security implementation milestones..." -ForegroundColor Cyan

    # Calculate dates (adjust as needed)
    $phase1Date = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")  # 2 weeks
    $phase2Date = (Get-Date).AddDays(28).ToString("yyyy-MM-dd")  # 4 weeks
    $phase3Date = (Get-Date).AddDays(42).ToString("yyyy-MM-dd")  # 6 weeks

    gh milestone create "Phase 1: Critical/High Security Fixes" --due-date $phase1Date --description "Address all CRITICAL and HIGH priority security vulnerabilities"
    gh milestone create "Phase 2: Medium Priority Security Fixes" --due-date $phase2Date --description "Implement medium priority security improvements"
    gh milestone create "Phase 3: Security Monitoring & Documentation" --due-date $phase3Date --description "Complete security monitoring setup and documentation"

    Write-Host "Milestones created successfully!" -ForegroundColor Green
}

# Function to assign issues to milestones
function Assign-SecurityMilestones {
    Write-Host "Assigning issues to implementation milestones..." -ForegroundColor Cyan

    # Phase 1: Critical/High (Week 1-2)
    gh issue edit 79 --milestone "Phase 1: Critical/High Security Fixes"
    gh issue edit 80 --milestone "Phase 1: Critical/High Security Fixes"
    gh issue edit 81 --milestone "Phase 1: Critical/High Security Fixes"
    gh issue edit 82 --milestone "Phase 1: Critical/High Security Fixes"

    # Phase 2: Medium (Week 3-4)
    gh issue edit 83 --milestone "Phase 2: Medium Priority Security Fixes"
    gh issue edit 84 --milestone "Phase 2: Medium Priority Security Fixes"
    gh issue edit 85 --milestone "Phase 2: Medium Priority Security Fixes"

    # Phase 3: Low/Documentation (Week 5-6)
    gh issue edit 86 --milestone "Phase 3: Security Monitoring & Documentation"
    gh issue edit 87 --milestone "Phase 3: Security Monitoring & Documentation"

    Write-Host "Issues assigned to milestones!" -ForegroundColor Green
}

# Function to show project status
function Show-ProjectStatus {
    Write-Host "Current Security Project Status:" -ForegroundColor Yellow
    Write-Host "================================" -ForegroundColor Yellow

    # Show project URL
    Write-Host "Project Board: https://github.com/users/Rafia-Bee/projects/2" -ForegroundColor White

    # Show recent issues
    Write-Host "`nSecurity Issues (Recent):" -ForegroundColor Cyan
    gh issue list --label security --limit 10

    # Show milestones
    Write-Host "`nProject Milestones:" -ForegroundColor Cyan
    gh milestone list
}

# Function to open project board
function Open-ProjectBoard {
    Write-Host "Opening Security Audit project board..." -ForegroundColor Cyan
    gh project view 2 --web
}

# Main menu
function Show-Menu {
    Write-Host "`n=== Security Project Management Menu ===" -ForegroundColor Green
    Write-Host "1. Show Project Status" -ForegroundColor White
    Write-Host "2. Open Project Board in Browser" -ForegroundColor White
    Write-Host "3. Create Milestones" -ForegroundColor White
    Write-Host "4. Assign Issues to Milestones" -ForegroundColor White
    Write-Host "5. Assign Issues to Team Members" -ForegroundColor White
    Write-Host "6. Run All Setup (3,4,5)" -ForegroundColor White
    Write-Host "7. Exit" -ForegroundColor White
    Write-Host "=================================" -ForegroundColor Green
}

# Main execution
do {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-7)"

    switch ($choice) {
        "1" { Show-ProjectStatus }
        "2" { Open-ProjectBoard }
        "3" { Create-SecurityMilestones }
        "4" { Assign-SecurityMilestones }
        "5" { Assign-SecurityIssues }
        "6" {
            Create-SecurityMilestones
            Assign-SecurityMilestones
            Assign-SecurityIssues
            Write-Host "Full setup complete!" -ForegroundColor Green
        }
        "7" {
            Write-Host "Exiting security project management." -ForegroundColor Yellow
            break
        }
        default { Write-Host "Invalid choice. Please select 1-7." -ForegroundColor Red }
    }

    if ($choice -ne "7") {
        Read-Host "`nPress Enter to continue..."
    }
} while ($choice -ne "7")

Write-Host "`n=== Security Project Setup Complete ===" -ForegroundColor Green
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review project board: https://github.com/users/Rafia-Bee/projects/2" -ForegroundColor White
Write-Host "2. Update team member usernames in this script" -ForegroundColor White
Write-Host "3. Start with Issue #79 (Critical: Secret Keys)" -ForegroundColor White
Write-Host "4. Use SECURITY_IMPLEMENTATION_ROADMAP.md for detailed timeline" -ForegroundColor White