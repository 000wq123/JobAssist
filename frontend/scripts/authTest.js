/* eslint-disable no-console -- This is a manual debug helper run from the
   browser console; pretty-printing via console.log is the entire point. */
/**
 * Authentication Test Utility
 * Run in browser console: import('./utils/authTest.js').then(m => m.runFullAuthTest())
 * Or: Copy and paste this into browser console
 */

const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:8000/api";

export async function runFullAuthTest() {
  console.log("🔍 Starting authentication flow test...\n");

  const results = {
    serverHealth: false,
    tokenInStorage: false,
    tokenValid: false,
    searchEndpointAuth: false,
  };

  try {
    // Test 1: Server health
    console.log("1️⃣  Testing server health...");
    const healthRes = await fetch(`${API_BASE.replace('/api', '')}/health`);
    results.serverHealth = healthRes.ok;
    console.log(`   ${healthRes.ok ? '✅' : '❌'} Server is ${healthRes.ok ? 'responding' : 'NOT responding'}\n`);

    // Test 2: Token in storage
    console.log("2️⃣  Checking localStorage...");
    const token = localStorage.getItem("access_token");
    results.tokenInStorage = !!token;
    if (token) {
      console.log(`   ✅ Token found (length: ${token.length})`);
      console.log(`   Token preview: ${token.substring(0, 20)}...\n`);
    } else {
      console.log(`   ❌ No token in localStorage!`);
      console.log(`   Make sure you're logged in first.\n`);
      return results;
    }

    // Test 3: Token validity
    console.log("3️⃣  Testing token validity...");
    const debugRes = await fetch(`${API_BASE}/auth/debug/token-info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const debugData = await debugRes.json();
    results.tokenValid = debugData.status === "valid";
    if (debugData.status === "valid") {
      console.log(`   ✅ Token is valid`);
      console.log(`   User ID: ${debugData.user_id}`);
      console.log(`   Expires: ${new Date(debugData.expires_at * 1000).toLocaleString()}\n`);
    } else {
      console.log(`   ❌ Token is invalid: ${debugData.error}\n`);
      return results;
    }

    // Test 4: Search endpoint with auth
    console.log("4️⃣  Testing authenticated search endpoint...");
    const searchRes = await fetch(`${API_BASE}/jobs/search/recommended?page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    results.searchEndpointAuth = searchRes.ok;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      console.log(`   ✅ Search endpoint is responding`);
      console.log(`   Found ${searchData.jobs?.length || 0} jobs\n`);
    } else {
      const errorData = await searchRes.json();
      console.log(`   ❌ Search endpoint returned ${searchRes.status}`);
      console.log(`   Error: ${errorData.detail}\n`);
    }

    // Summary
    console.log("📊 Test Summary:");
    console.log(`   Server health: ${results.serverHealth ? '✅' : '❌'}`);
    console.log(`   Token in storage: ${results.tokenInStorage ? '✅' : '❌'}`);
    console.log(`   Token valid: ${results.tokenValid ? '✅' : '❌'}`);
    console.log(`   Search endpoint auth: ${results.searchEndpointAuth ? '✅' : '❌'}`);

    const allPass = Object.values(results).every(v => v);
    console.log(`\n${allPass ? '🎉 All tests passed!' : '⚠️  Some tests failed. See above for details.'}`);

    return results;
  } catch (error) {
    console.error("💥 Test error:", error.message);
    return results;
  }
}

// Also expose individual test functions
export async function testToken() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    console.log("No token found. Log in first.");
    return;
  }

  const res = await fetch(`${API_BASE}/auth/debug/token-info`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  console.log("Token info:", data);
  return data;
}

export async function testSearch() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    console.log("No token found. Log in first.");
    return;
  }

  const res = await fetch(`${API_BASE}/jobs/search/recommended?page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  console.log("Search response:", data);
  return data;
}

console.log("✅ Auth test utilities loaded. Use:");
console.log("  runFullAuthTest() - Run complete auth flow test");
console.log("  testToken() - Check if token is valid");
console.log("  testSearch() - Test search endpoint");
