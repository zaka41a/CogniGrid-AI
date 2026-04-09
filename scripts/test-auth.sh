#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# CogniGrid AI — Auth Service Test Script
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL="http://localhost:8080"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

ok()   { echo -e "  ${GREEN}✅ PASS${RESET} — $1"; ((PASS++)); }
fail() { echo -e "  ${RED}❌ FAIL${RESET} — $1"; ((FAIL++)); }
info() { echo -e "\n${CYAN}▶ $1${RESET}"; }
sep()  { echo -e "${YELLOW}────────────────────────────────────────────${RESET}"; }

sep
echo -e "${CYAN}  CogniGrid AI — Auth Test Suite${RESET}"
sep

# ─────────────────────────────────────────────────────────────────────────────
# 1. Health Check
# ─────────────────────────────────────────────────────────────────────────────
info "1. Health Check"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/actuator/health")
if [ "$HEALTH" = "200" ]; then
  ok "Gateway is UP (HTTP $HEALTH)"
else
  fail "Gateway not responding (HTTP $HEALTH) — is the server running?"
  echo -e "\n${RED}Abort: server is not reachable.${RESET}"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Register new user
# ─────────────────────────────────────────────────────────────────────────────
info "2. Register new user"

REGISTER_BODY=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"testuser@cognigrid.ai","password":"Test@1234"}')

echo "  Response: $REGISTER_BODY" | head -c 200
echo ""

ACCESS_TOKEN=$(echo "$REGISTER_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$REGISTER_BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ACCESS_TOKEN" ]; then
  ok "Register returned access token"
else
  fail "Register did not return access token"
fi

if [ -n "$REFRESH_TOKEN" ]; then
  ok "Register returned refresh token"
else
  fail "Register did not return refresh token"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Register duplicate (should fail with 401/400)
# ─────────────────────────────────────────────────────────────────────────────
info "3. Register duplicate email (expect error)"

DUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"testuser@cognigrid.ai","password":"Test@1234"}')

if [ "$DUP_STATUS" != "201" ] && [ "$DUP_STATUS" != "200" ]; then
  ok "Duplicate email rejected (HTTP $DUP_STATUS)"
else
  fail "Duplicate email was accepted — should have been rejected"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4. Login with correct credentials
# ─────────────────────────────────────────────────────────────────────────────
info "4. Login — correct credentials"

LOGIN_BODY=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@cognigrid.ai","password":"Test@1234"}')

echo "  Response: $LOGIN_BODY" | head -c 200
echo ""

LOGIN_TOKEN=$(echo "$LOGIN_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
LOGIN_REFRESH=$(echo "$LOGIN_BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$LOGIN_TOKEN" ]; then
  ok "Login returned access token"
  ACCESS_TOKEN="$LOGIN_TOKEN"
else
  fail "Login did not return access token"
fi

if [ -n "$LOGIN_REFRESH" ]; then
  ok "Login returned refresh token"
  REFRESH_TOKEN="$LOGIN_REFRESH"
else
  fail "Login did not return refresh token"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5. Login with wrong password (should fail)
# ─────────────────────────────────────────────────────────────────────────────
info "5. Login — wrong password (expect 401)"

WRONG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@cognigrid.ai","password":"WrongPassword"}')

if [ "$WRONG_STATUS" = "401" ]; then
  ok "Wrong password rejected (HTTP 401)"
else
  fail "Wrong password should return 401, got HTTP $WRONG_STATUS"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6. Access protected endpoint without token (should fail)
# ─────────────────────────────────────────────────────────────────────────────
info "6. Protected endpoint — no token (expect 401/403)"

NO_TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users")

if [ "$NO_TOKEN_STATUS" = "401" ] || [ "$NO_TOKEN_STATUS" = "403" ]; then
  ok "Protected endpoint blocked without token (HTTP $NO_TOKEN_STATUS)"
else
  fail "Protected endpoint should block unauthenticated requests, got HTTP $NO_TOKEN_STATUS"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7. Access protected endpoint with valid token
# ─────────────────────────────────────────────────────────────────────────────
info "7. Protected endpoint — with valid token"

if [ -n "$ACCESS_TOKEN" ]; then
  AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  if [ "$AUTH_STATUS" = "200" ] || [ "$AUTH_STATUS" = "403" ]; then
    # 403 is acceptable here — user is ANALYST, /api/users requires ADMIN
    ok "Token accepted by server (HTTP $AUTH_STATUS)"
  else
    fail "Valid token should be accepted, got HTTP $AUTH_STATUS"
  fi
else
  fail "Skipped — no access token available"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 8. Login as Admin
# ─────────────────────────────────────────────────────────────────────────────
info "8. Login — default admin account"

ADMIN_BODY=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cognigrid.ai","password":"Admin@2024"}')

ADMIN_TOKEN=$(echo "$ADMIN_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
ADMIN_ROLE=$(echo "$ADMIN_BODY" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
  ok "Admin login successful"
else
  fail "Admin login failed"
fi

if [ "$ADMIN_ROLE" = "ADMIN" ]; then
  ok "Admin role confirmed"
else
  fail "Expected role ADMIN, got: $ADMIN_ROLE"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 9. Access /api/users as Admin (should work)
# ─────────────────────────────────────────────────────────────────────────────
info "9. Admin access to /api/users"

if [ -n "$ADMIN_TOKEN" ]; then
  ADMIN_USERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

  if [ "$ADMIN_USERS_STATUS" = "200" ]; then
    ok "Admin can access /api/users (HTTP 200)"
  else
    fail "Admin should access /api/users, got HTTP $ADMIN_USERS_STATUS"
  fi
else
  fail "Skipped — no admin token available"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 10. Refresh token
# ─────────────────────────────────────────────────────────────────────────────
info "10. Refresh access token"

if [ -n "$REFRESH_TOKEN" ]; then
  REFRESH_BODY=$(curl -s -X POST "$BASE_URL/api/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

  NEW_TOKEN=$(echo "$REFRESH_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$NEW_TOKEN" ]; then
    ok "Refresh returned new access token"
  else
    fail "Refresh did not return new access token"
  fi
else
  fail "Skipped — no refresh token available"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 11. Logout
# ─────────────────────────────────────────────────────────────────────────────
info "11. Logout"

if [ -n "$REFRESH_TOKEN" ]; then
  LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/logout" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

  if [ "$LOGOUT_STATUS" = "204" ]; then
    ok "Logout successful (HTTP 204)"
  else
    fail "Logout returned HTTP $LOGOUT_STATUS instead of 204"
  fi
else
  fail "Skipped — no refresh token available"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 12. Use refresh token after logout (should fail)
# ─────────────────────────────────────────────────────────────────────────────
info "12. Refresh after logout (expect error)"

if [ -n "$REFRESH_TOKEN" ]; then
  EXPIRED_BODY=$(curl -s -X POST "$BASE_URL/api/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

  EXPIRED_TOKEN=$(echo "$EXPIRED_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$EXPIRED_TOKEN" ]; then
    ok "Invalidated refresh token correctly rejected"
  else
    fail "Invalidated refresh token should be rejected"
  fi
else
  fail "Skipped — no refresh token available"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 13. Validation — missing fields (expect 400)
# ─────────────────────────────────────────────────────────────────────────────
info "13. Validation — empty password (expect 400)"

VAL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"No Pass","email":"nopass@test.com","password":""}')

if [ "$VAL_STATUS" = "400" ]; then
  ok "Empty password rejected (HTTP 400)"
else
  fail "Empty password should return 400, got HTTP $VAL_STATUS"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Results
# ─────────────────────────────────────────────────────────────────────────────
sep
TOTAL=$((PASS + FAIL))
echo -e "  Results: ${GREEN}$PASS passed${RESET} / ${RED}$FAIL failed${RESET} / $TOTAL total"
sep

if [ "$FAIL" -eq 0 ]; then
  echo -e "\n${GREEN}  All tests passed!${RESET}\n"
  exit 0
else
  echo -e "\n${RED}  Some tests failed. Check the output above.${RESET}\n"
  exit 1
fi
