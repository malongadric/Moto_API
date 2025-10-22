param(
  [Parameter(Mandatory=$false)]
  $Ids = @(1,2),
  [int]$ActeurId = 3
)

# Accept comma-separated string like "1,2" as well as int[]
if ($Ids -is [string]) {
  $Ids = $Ids -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' } | ForEach-Object { [int]$_ }
} elseif ($Ids -isnot [System.Array]) {
  $Ids = @($Ids)
}

$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwibm9tIjoiTWFsb25nYSIsInByb2ZpbCI6ImFkbWluIiwiZGVwYXJ0ZW1lbnRfaWQiOjIsInBlcm1pc3Npb25zIjpbInJlYWRfc3RhdHMiLCJtYW5hZ2VfdXNlcnMiLCJhc3NpZ25faW1tYXRyaWN1bGF0aW9uIl0sImlhdCI6MTc2MTE0NjY4NSwiZXhwIjoxNzYxMTg5ODg1fQ.GOJLn0R3qJhTNYFJjuTiFINT84rPpHbPvLYZgnlejlQ'
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

Write-Output ("Will update IDs: {0} -> acteur_id {1}" -f ($Ids -join ','), $ActeurId)
foreach ($id in $Ids) {
  $uri = "https://moto-api-cika.onrender.com/api/dossier_admin/$id"
  $body = @{ acteur_id = $ActeurId } | ConvertTo-Json -Depth 3
  try {
    $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method PUT -Body $body -ErrorAction Stop
    Write-Output ("OK: Updated {0} -> acteur_id {1}" -f $id, $ActeurId)
  } catch {
    Write-Output ("ERROR updating {0} -> {1}" -f $id, $_.Exception.Message)
  }
}
