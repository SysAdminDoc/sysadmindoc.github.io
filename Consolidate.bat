@echo off
setlocal enableDelayedExpansion

:: =====================================================================
:: Batch Script: Robust Image Store Consolidation Test Run (__2013 ONLY)
:: Operation: Consolidate contents (subfolders and files) from ONLY the 
::            '__2013' directory into the single target directory.
:: MODE: SAFER COPY (Source files are NOT deleted. Manual verification required.)
:: =====================================================================

:: --- CONFIGURATION ---
set "SourceRoot=F:\Opal\image_store"
set "TargetRoot=F:\Temp image_store"
set "LogFile=%SourceRoot%\image_store_migration_TEST_2013_log.txt"
set "TestYear=__2013"

:: Create the target directory if it doesn't exist
if not exist "%TargetRoot%" (
    echo [CRITICAL] Creating target directory: "%TargetRoot%"
    mkdir "%TargetRoot%"
)

echo [CRITICAL] Starting TEST consolidation run at %DATE% %TIME% >> "%LogFile%"
echo TEST SCOPE: ONLY %TestYear% >> "%LogFile%"
echo Source Root: %SourceRoot% >> "%LogFile%"
echo Target Root: %TargetRoot% >> "%LogFile%"
echo -------------------------------------------------- >> "%LogFile%"
echo.

:: --- EXECUTION: CONSOLIDATION TEST ---
:: This runs Robocopy ONLY on the contents of the specified TestYear folder.
set "ErrorFlag=0"

set "SourcePath=%SourceRoot%\%TestYear%"
echo Processing contents of: %TestYear%
echo Processing contents of: %TestYear% >> "%LogFile%"

if exist "!SourcePath!\" (
    :: Robocopy copies the *contents* of the SourcePath to the TargetRoot.
    :: /E :: Copy subdirectories, including empty ones.
    :: /ZB :: Restartable mode (for access denied) / Backup mode (requires elevated privileges).
    :: /DCOPY:T :: Copy directory timestamps.
    :: /COPYALL :: Copy ALL file information (Data, Attributes, Timestamps, Security, Owner, Audit).
    :: /R:3 /W:5 :: Retry 3 times, wait 5 seconds.
    
    robocopy "!SourcePath!" "%TargetRoot%" /E /ZB /DCOPY:T /COPYALL /R:3 /W:5 /NP /TEE /LOG+:"%LogFile%"
    
    if errorlevel 8 (
        echo WARNING: Robocopy reported errors (ErrorLevel: !errorlevel!) for %TestYear%. Check the log file for specific failures.
        echo WARNING: Robocopy reported errors (ErrorLevel: !errorlevel!) for %TestYear%. Check the log file for specific failures. >> "%LogFile%"
        set "ErrorFlag=1"
    ) else (
        echo SUCCESS: Contents of %TestYear% consolidated.
        echo SUCCESS: Contents of %TestYear% consolidated. >> "%LogFile%"
    )
) else (
    echo CRITICAL: Source test folder %TestYear% not found. Cannot proceed.
    echo CRITICAL: Source test folder %TestYear% not found. Cannot proceed. >> "%LogFile%"
    set "ErrorFlag=1"
)
echo -------------------------------------------------- >> "%LogFile%"

echo.
echo ==================================================
if %ErrorFlag% equ 1 (
    echo TEST RUN FINISHED WITH WARNINGS/ERRORS.
    echo CRITICALLY: CHECK THE LOG: "%LogFile%" AND VERIFY TARGET.
) else (
    echo TEST RUN FINISHED SUCCESSFULLY (COPY ONLY).
    echo CONSOLIDATION TEST IS COMPLETE.
    echo ACTION REQUIRED: VERIFY FILES IN: "%TargetRoot%"
    echo THEN, MANUALLY DELETE THE COPIED FOLDERS FROM "%TargetRoot%" BEFORE FULL RUN.
)
echo ==================================================

endlocal