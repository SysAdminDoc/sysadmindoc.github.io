#Requires -Version 7.0
<#
.SYNOPSIS
    Registers, or checks, the scheduled task that runs the portfolio's nightly refresh and deploy.

.DESCRIPTION
    The task runs scripts/refresh-and-deploy.mjs from this checkout every day. It starts node
    through `conhost.exe --headless`, so no console window ever appears on the desktop (a hidden
    window style still flashes one). It uses the non-versioned node.exe path, starts late when
    the PC was asleep or off, and has no battery conditions: a Modern Standby desktop defers
    battery-flagged tasks indefinitely instead of counting them as missed.

    Registering again replaces the task, so running this twice still leaves exactly one.

.PARAMETER Check
    Report the task without changing it. Exits 1 when the task is missing or disabled, or when
    the last run is still recorded as "running" past the two-hour limit, which means something
    ended it from outside.

.PARAMETER At
    Daily start time. Defaults to 03:00.

.EXAMPLE
    pwsh -NoProfile -File scripts\register-nightly-task.ps1
.EXAMPLE
    pwsh -NoProfile -File scripts\register-nightly-task.ps1 -Check
#>
[CmdletBinding()]
param(
    [switch]$Check,
    [string]$TaskName = 'Portfolio Refresh and Deploy',
    [string]$At = '03:00'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$statusFile = Join-Path $repo '.tmp\refresh-and-deploy-status.json'
$runLimitHours = 2

if ($Check) {
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Host "MISSING: no scheduled task named '$TaskName'. Run scripts\register-nightly-task.ps1 to create it."
        exit 1
    }
    if ($task.State -eq 'Disabled') {
        Write-Host "DISABLED: '$TaskName' exists but is disabled."
        exit 1
    }
    $info = $task | Get-ScheduledTaskInfo
    Write-Host ("OK: '{0}' is {1}; last run {2} (result 0x{3:X}); next run {4}." -f $TaskName, $task.State, $info.LastRunTime, $info.LastTaskResult, $info.NextRunTime)
    if (Test-Path $statusFile) {
        $status = Get-Content $statusFile -Raw | ConvertFrom-Json -DateKind String
        $ageHours = ([DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse($status.at)).TotalHours
        if ($status.status -eq 'running' -and $ageHours -gt $runLimitHours) {
            Write-Host ("KILLED: the run that started {0} is still recorded as running {1:N1}h later, so something ended it from outside. See .tmp\refresh-and-deploy.log." -f $status.startedAt, $ageHours)
            exit 1
        }
        $stepNote = if ($status.step) { " at step $($status.step)" } else { '' }
        Write-Host ("Last recorded outcome: {0}{1}, {2:N1}h ago." -f $status.status, $stepNote, $ageHours)
    }
    exit 0
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
if ($node -match '\\WindowsApps\\') {
    throw "node.exe resolves to a WindowsApps path ($node). A versioned package path breaks on the next update; install Node from nodejs.org so the task has a stable path."
}
$conhost = Join-Path $env:WINDIR 'System32\conhost.exe'

$action = New-ScheduledTaskAction -Execute $conhost -Argument ("--headless `"{0}`" scripts\refresh-and-deploy.mjs" -f $node) -WorkingDirectory $repo
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours $runLimitHours) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$description = "Nightly refresh and deploy of portfolio.getparkerai.com, registered by scripts\register-nightly-task.ps1 in $repo. Runs node headless through conhost so no window appears."

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $description -Force | Out-Null
$count = @(Get-ScheduledTask | Where-Object TaskName -eq $TaskName).Count
Write-Host "Registered '$TaskName': daily at $At, $count task with that name, node at $node."
