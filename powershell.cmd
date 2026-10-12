@echo off
set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\WindowsPowerShell\v1.0;C:\Program Files\dotnet;%PATH%"
powershell.exe -ExecutionPolicy Bypass %*
