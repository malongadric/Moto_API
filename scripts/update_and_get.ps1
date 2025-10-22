param(
  [int]$Id = 1,
  [int]$ActeurId = 3
)
$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwibm9tIjoiTWFsb25nYSIsInByb2ZpbCI6ImFkbWluIiwiZGVwYXJ0ZW1lbnRfaWQiOjIsInBlcm1pc3Npb25zIjpbInJlYWRfc3RhdHMiLCJtYW5hZ2VfdXNlcnMiLCJhc3NpZ25faW1tYXRyaWN1bGF0aW9uIl0sImlhdCI6MTc2MTE0NjY4NSwiZXhwIjoxNzYxMTg5ODg1fQ.GOJLn0R3qJhTNYFJjuTiFINT84rPpHbPvLYZgnlejlQ'
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
$uri = "https://moto-api-cika.onrender.com/api/dossier_admin/$Id"
$body = @{ acteur_id = $ActeurId } | ConvertTo-Json -Depth 3

Write-Output "PUT $uri with body: $body"
try {
  $putRes = Invoke-RestMethod -Uri $uri -Method PUT -Headers $headers -Body $body -ErrorAction Stop
  Write-Output "PUT response:"
  $putRes | ConvertTo-Json -Depth 6 | Out-File -FilePath .\put_response.json -Encoding utf8
  Write-Output (Get-Content .\put_response.json)
} catch {
  Write-Output "PUT ERROR: $($_.Exception.Message)"
}

# Now GET
try {
  $getRes = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers -ErrorAction Stop
  Write-Output "GET response:"
  $getRes | ConvertTo-Json -Depth 6 | Out-File -FilePath .\get_response.json -Encoding utf8
  Write-Output (Get-Content .\get_response.json)
} catch {
  Write-Output "GET ERROR: $($_.Exception.Message)"
}
