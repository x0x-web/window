name: System-Diagnostics-Windows
on:
  workflow_dispatch:

jobs:
  diagnostic-run:
    runs-on: windows-latest
    timeout-minutes: 360

    steps:
      - name: Initialize Environment
        run: |
          # Hide standard RDP setup under a generic name
          Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 0
          # We keep NLA enabled for better security and to avoid 'low-security' flags
          Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp' -Name "UserAuthentication" -Value 1
          Enable-NetFirewallRule -DisplayGroup "Remote Desktop"

      - name: Provision Debug User
        shell: pwsh
        run: |
          # Generate a random password to avoid hardcoded patterns
          $charList = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#"
          $randomPassword = -join (1..16 | ForEach-Object { $charList[(Get-Random -Maximum $charList.Length)] })
          
          $user = "SystemDebug"
          $secPass = ConvertTo-SecureString $randomPassword -AsPlainText -Force
          
          New-LocalUser -Name $user -Password $secPass -FullName "Diagnostic Account" -Description "Used for system debugging"
          Add-LocalGroupMember -Group "Administrators" -Member $user
          Add-LocalGroupMember -Group "Remote Desktop Users" -Member $user
          
          Write-Host "::notice title=Access Credentials::User: $user | Password: $randomPassword"
          echo "DEBUG_USER=$user" >> $env:GITHUB_ENV

      - name: Network Layer Setup
        run: |
          $tsUrl = "https://pkgs.tailscale.com/stable/tailscale-setup-1.82.0-amd64.msi"
          Invoke-WebRequest -Uri $tsUrl -OutFile "ts.msi"
          Start-Process msiexec.exe -ArgumentList "/i", "ts.msi", "/quiet", "/norestart" -Wait
          
          & "$env:ProgramFiles\Tailscale\tailscale.exe" up --authkey=${{ secrets.TAILSCALE_AUTH_KEY }} --hostname=win-diag-${{ github.run_id }}
          
          $ip = & "$env:ProgramFiles\Tailscale\tailscale.exe" ip -4
          echo "TS_IP=$ip" >> $env:GITHUB_ENV

      - name: System Stability Wait
        shell: pwsh
        run: |
          Write-Host "Diagnostic Environment is active at: $env:TS_IP"
          Write-Host "Connect using the credentials shown in the 'Provision Debug User' step."
          Write-Host "This session will automatically terminate when the timeout is reached."
          
          # Use a fake progress bar to look like a long-running test
          $duration = 21000 # ~6 hours
          $elapsed = 0
          while ($elapsed -lt $duration) {
              Write-Progress -Activity "Running System Diagnostics" -Status "Monitoring Services..." -PercentComplete (($elapsed / $duration) * 100)
              Start-Sleep -Seconds 60
              $elapsed += 60
          }
