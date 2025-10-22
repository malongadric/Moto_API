$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwibm9tIjoiTWFsb25nYSIsInByb2ZpbCI6ImFkbWluIiwiZGVwYXJ0ZW1lbnRfaWQiOjIsInBlcm1pc3Npb25zIjpbInJlYWRfc3RhdHMiLCJtYW5hZ2VfdXNlcnMiLCJhc3NpZ25faW1tYXRyaWN1bGF0aW9uIl0sImlhdCI6MTc2MTE0NjY4NSwiZXhwIjoxNzYxMTg5ODg1fQ.GOJLn0R3qJhTNYFJjuTiFINT84rPpHbPvLYZgnlejlQ'
$headers = @{ Authorization = "Bearer $token" }

try {
  $res = Invoke-RestMethod -Uri 'https://moto-api-cika.onrender.com/api/dossiers' -Headers $headers -Method GET -ErrorAction Stop
  $res | ConvertTo-Json -Depth 6 | Out-File -FilePath .\response.json -Encoding utf8
  Write-Output 'OK'
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  exit 1
}
