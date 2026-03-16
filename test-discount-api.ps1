# Test Discount API Endpoints
# This creates a test JWT token and uses it to test the discount API

Add-Type -AssemblyName System.Web

Write-Host "========== DISCOUNT API TEST ==========" -ForegroundColor Cyan

# Generate a simple JWT token for testing (using the secret 'supersecret' from .env)
# JWT format: header.payload.signature
# We'll use eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 ({"alg":"HS256","type":"JWT"})

# Create a proper JWT token for testing
$jwtSecret = "supersecret"

# Create header
$header = @{
    alg = "HS256"
    typ = "JWT"
} | ConvertTo-Json -Compress | [System.Text.Encoding]::UTF8.GetBytes

# Create payload with test merchant
$payload = @{
    merchantId = "test-merchant-001"
    sub = "test-user"
    iat = (Get-Date).AddSeconds(-10).ToFileTime()
    exp = (Get-Date).AddDays(1).ToFileTime()
} | ConvertTo-Json -Compress | [System.Text.Encoding]::UTF8.GetBytes

# For simplicity in this test, we'll use a mock token approach
# In production, this would need proper signing
$mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudElkIjoidGVzdC1tZXJjaGFudC0wMDEiLCJzdWIiOiJ0ZXN0LXVzZXIifQ.test"

Write-Host "`nUsing test token for authentication..." -ForegroundColor Yellow

# Test 1: Health Check
Write-Host "`n[1] Testing API Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/" -Method GET -UseBasicParsing
    Write-Host "[OK] Backend is running (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Backend not accessible" -ForegroundColor Red
    exit 1
}

# Headers for authenticated requests
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $mockToken"
}

# Test 2: Create Discount Rule
Write-Host "`n[2] Creating Discount Rule..." -ForegroundColor Yellow
$discountBody = @{
    name = "Test 10% Off"
    code = "TEST10"
    type = "PERCENTAGE"
    value = 10
    minOrderAmount = 50
    isActive = $true
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:4000/discounts/rules" `
        -Method POST `
        -Body $discountBody `
        -Headers $authHeaders `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Discount rule created (ID: $($data.id))" -ForegroundColor Green
    $ruleId = $data.id
} catch {
    Write-Host "[FAIL] Failed to create discount rule" -ForegroundColor Red
    Write-Host "Status: $(try { $_.Exception.Response.StatusCode.ToString() } catch { 'Unknown' })" -ForegroundColor Red
    Write-Host "Check that token authentication is working properly" -ForegroundColor Yellow
}

# Test 3: List Discount Rules
Write-Host "`n[3] Listing Discount Rules..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:4000/discounts/rules" `
        -Method GET `
        -Headers $authHeaders `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "[OK] Found $($data.pagination.total) discount rules" -ForegroundColor Green
    if ($data.data.Count -gt 0) {
        Write-Host "Rules:" -ForegroundColor Cyan
        $data.data | ForEach-Object {
            Write-Host "  - $($_.name) (Code: $($_.code), Type: $($_.type), Value: $($_.value))"
        }
    }
} catch {
    Write-Host "[FAIL] Failed to list discount rules" -ForegroundColor Red
}

# Test 4: Validate Promo Code (this one doesn't require auth in the routes)
Write-Host "`n[4] Validating Promo Code..." -ForegroundColor Yellow
$validateBody = @{
    code = "TEST10"
    subtotal = 100
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:4000/discounts/validate-code" `
        -Method POST `
        -Body $validateBody `
        -Headers $authHeaders `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    if ($data.valid) {
        Write-Host "[OK] Promo code is valid!" -ForegroundColor Green
        Write-Host "  Discount Amount: GHS $($data.discountAmount)" -ForegroundColor Green
        Write-Host "  Rule: $($data.rule.name)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Promo code validation returned false: $($data.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Failed to validate promo code" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========== TEST SUMMARY ==========" -ForegroundColor Cyan
Write-Host "[OK] Backend is operational and responding" -ForegroundColor Green
Write-Host "NOTE: Full API testing requires proper JWT authentication" -ForegroundColor Yellow
Write-Host "To test the terminal app, run: 'flutter run'" -ForegroundColor Cyan
