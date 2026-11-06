#!/usr/bin/env node

/**
 * OpsPilot Production Smoke-Test Suite
 * Validates availability, health probes, security headers, CORS, OpenAPI documentation,
 * latency, and authenticated route guards against a running OpsPilot environment.
 *
 * Usage:
 *   node scripts/smoke-test.js [target_url]
 * Default target: http://localhost:5000
 */

const targetUrl = (process.argv[2] || process.env.TARGET_URL || 'http://localhost:5000').replace(/\/+$/, '');

const results = [];
let passedCount = 0;
let failedCount = 0;

function recordResult(testName, passed, details, latencyMs) {
  if (passed) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName} (${latencyMs}ms)`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName} - ${details} (${latencyMs}ms)`);
  }
  results.push({ testName, passed, details, latencyMs });
}

async function request(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const latencyMs = Math.round(performance.now() - start);
    return { res, latencyMs, error: null };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return { res: null, latencyMs, error: err.message };
  }
}

async function runSmokeTests() {
  console.log('\n=====================================================================');
  console.log(` OpsPilot Production Smoke Test Suite`);
  console.log(` Target Host: ${targetUrl}`);
  console.log(` Timestamp:   ${new Date().toISOString()}`);
  console.log('=====================================================================\n');

  // Test 1: Load Balancer Root Health Probe (/health)
  console.log('[1/8] Verifying Root Load Balancer Probe...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/health`);
    if (error || !res) {
      recordResult('Root Health Probe (/health)', false, error, latencyMs);
    } else {
      const isOk = res.status === 200;
      const data = await res.json().catch(() => ({}));
      recordResult('Root Health Probe (/health)', isOk && data.data?.status === 'healthy', `Status ${res.status}`, latencyMs);
    }
  }

  // Test 2: Standard API Health Check (/api/v1/health)
  console.log('\n[2/8] Verifying Operational API Health Endpoint...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/api/v1/health`);
    if (error || !res) {
      recordResult('API Health (/api/v1/health)', false, error, latencyMs);
    } else {
      const data = await res.json().catch(() => ({}));
      const isValid = res.status === 200 && data.success === true && data.data?.status === 'healthy';
      recordResult(
        'API Health (/api/v1/health)',
        isValid,
        `Status ${res.status}, Service: ${data.data?.service}, MultiTenancy: ${data.data?.features?.multiTenancy}`,
        latencyMs
      );
    }
  }

  // Test 3: Kubernetes Container Liveness Probe (/api/v1/health/liveness)
  console.log('\n[3/8] Verifying Liveness Probe (/api/v1/health/liveness)...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/api/v1/health/liveness`);
    if (error || !res) {
      recordResult('Liveness Probe', false, error, latencyMs);
    } else {
      const data = await res.json().catch(() => ({}));
      const isValid = res.status === 200 && data.data?.status === 'alive';
      recordResult('Liveness Probe', isValid, `Status ${res.status}`, latencyMs);
    }
  }

  // Test 4: Kubernetes Deep Readiness Probe (/api/v1/health/readiness)
  console.log('\n[4/8] Verifying Readiness Probe (/api/v1/health/readiness)...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/api/v1/health/readiness`);
    if (error || !res) {
      recordResult('Readiness Probe', false, error, latencyMs);
    } else {
      const data = await res.json().catch(() => ({}));
      const isValid = res.status === 200 && data.data?.ready === true;
      recordResult(
        'Readiness Probe',
        isValid,
        `Status ${res.status}, Ready: ${data.data?.ready}, DB Check: ${data.data?.checks?.database?.status}`,
        latencyMs
      );
    }
  }

  // Test 5: HTTP Security Headers Audit (Helmet)
  console.log('\n[5/8] Verifying Production HTTP Security Headers...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/api/v1/health`);
    if (error || !res) {
      recordResult('Security Headers Audit', false, error, latencyMs);
    } else {
      const headers = res.headers;
      const hasContentTypeOptions = headers.get('x-content-type-options') === 'nosniff';
      const hasFrameOptions = !!headers.get('x-frame-options');
      const hasXssProtection = !!headers.get('x-xss-protection');
      const passed = hasContentTypeOptions && hasFrameOptions;
      recordResult(
        'Security Headers Audit',
        passed,
        `X-Content-Type-Options: ${headers.get('x-content-type-options')}, X-Frame-Options: ${headers.get('x-frame-options')}`,
        latencyMs
      );
    }
  }

  // Test 6: Production CORS Headers Check
  console.log('\n[6/8] Verifying Cross-Origin Resource Sharing (CORS) Configuration...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/api/v1/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    });
    if (error || !res) {
      recordResult('CORS Preflight Check', false, error, latencyMs);
    } else {
      const allowOrigin = res.headers.get('access-control-allow-origin');
      const passed = res.status === 204 && (allowOrigin === 'http://localhost:5173' || allowOrigin === '*');
      recordResult('CORS Preflight Check', passed, `Status ${res.status}, Allow-Origin: ${allowOrigin}`, latencyMs);
    }
  }

  // Test 7: Protected Route Authentication Guard
  console.log('\n[7/8] Verifying Unauthenticated Access Control Guard...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/api/v1/projects`);
    if (error || !res) {
      recordResult('Protected Route Guard (HTTP 401)', false, error, latencyMs);
    } else {
      const data = await res.json().catch(() => ({}));
      const passed = res.status === 401 && data.success === false;
      recordResult(
        'Protected Route Guard (HTTP 401)',
        passed,
        `Status ${res.status}, Error Code: ${data.error?.code}`,
        latencyMs
      );
    }
  }

  // Test 8: OpenAPI / Swagger Documentation Reachability
  console.log('\n[8/8] Verifying OpenAPI Interactive Documentation Reachability...');
  {
    const { res, latencyMs, error } = await request(`${targetUrl}/api/v1/docs/`);
    if (error || !res) {
      recordResult('OpenAPI Documentation (/api/v1/docs/)', false, error, latencyMs);
    } else {
      const passed = res.status === 200 || res.status === 301;
      recordResult('OpenAPI Documentation (/api/v1/docs/)', passed, `Status ${res.status}`, latencyMs);
    }
  }

  // Latency benchmark
  console.log('\n[Benchmark] Measuring Average Pings Latency (5 samples)...');
  const latencies = [];
  for (let i = 0; i < 5; i++) {
    const { latencyMs } = await request(`${targetUrl}/api/v1/health/liveness`);
    latencies.push(latencyMs);
  }
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  console.log(`  Min: ${minLatency}ms | Avg: ${avgLatency}ms | Max: ${maxLatency}ms`);

  console.log('\n=====================================================================');
  console.log(' Smoke Test Execution Summary');
  console.log('=====================================================================');
  console.log(` Total Checks:  ${results.length}`);
  console.log(` Passed Checks: ${passedCount}`);
  console.log(` Failed Checks: ${failedCount}`);
  console.log(` Success Rate:  ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log(` Avg Latency:   ${avgLatency}ms`);
  console.log('=====================================================================\n');

  if (failedCount > 0) {
    console.error('Smoke tests failed! Check errors above.');
    process.exit(1);
  } else {
    console.log('✓ All OpsPilot production smoke tests passed successfully!');
    process.exit(0);
  }
}

runSmokeTests();
