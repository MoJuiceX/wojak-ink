import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const activeUsers = new Gauge('active_users');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100, name: 'ramp-up' },      // Ramp up to 100 users
    { duration: '1m30s', target: 100, name: 'stay' },        // Stay at 100 users
    { duration: '1m', target: 500, name: 'ramp-up-2' },      // Ramp to 500 users
    { duration: '2m', target: 500, name: 'stay-2' },         // Stay at 500 users
    { duration: '30s', target: 1000, name: 'spike' },        // Spike to 1000 users
    { duration: '1m', target: 1000, name: 'stay-spike' },    // Stay at 1000 users
    { duration: '30s', target: 0, name: 'ramp-down' },       // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],        // 95% under 500ms, 99% under 1s
    'http_req_failed': ['rate<0.05'],                         // Less than 5% error rate
    'errors': ['rate<0.05'],                                  // Less than 5% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api`;

export default function () {
  activeUsers.set(__VU);

  // Group 1: Leaderboard read-heavy queries
  group('Leaderboard Queries (Read-Heavy)', () => {
    const gameIds = ['game-1', 'game-2', 'game-3', 'game-4', 'game-5'];
    const gameId = gameIds[Math.floor(Math.random() * gameIds.length)];

    const response = http.get(
      `${API_ENDPOINT}/leaderboards?game_id=${gameId}&limit=100`,
      {
        tags: { endpoint: 'leaderboard' },
      }
    );

    apiDuration.add(response.timings.duration, { endpoint: 'leaderboard' });

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'response contains data': (r) => r.body.length > 0,
    });

    success ? successfulRequests.add(1) : failedRequests.add(1);
    errorRate.add(!success);
  });

  sleep(0.5);

  // Group 2: User profile queries
  group('User Profile Queries (Mixed)', () => {
    const userIds = Array.from({ length: 100 }, (_, i) => `user-${i + 1}`);
    const userId = userIds[Math.floor(Math.random() * userIds.length)];

    const response = http.get(`${API_ENDPOINT}/users/${userId}`, {
      tags: { endpoint: 'user-profile' },
    });

    apiDuration.add(response.timings.duration, { endpoint: 'user-profile' });

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
    });

    success ? successfulRequests.add(1) : failedRequests.add(1);
    errorRate.add(!success);
  });

  sleep(0.5);

  // Group 3: Write operations (less frequent)
  group('Write Operations (Game Score)', () => {
    const payload = {
      user_id: `user-${Math.floor(Math.random() * 100) + 1}`,
      game_id: `game-${Math.floor(Math.random() * 5) + 1}`,
      score: Math.floor(Math.random() * 1000),
      duration_seconds: Math.floor(Math.random() * 300),
    };

    const response = http.post(`${API_ENDPOINT}/game-history`, JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'game-score-post' },
    });

    apiDuration.add(response.timings.duration, { endpoint: 'game-score-post' });

    const success = check(response, {
      'status is 201': (r) => r.status === 201,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    success ? successfulRequests.add(1) : failedRequests.add(1);
    errorRate.add(!success);
  });

  sleep(1);

  // Group 4: Complex query with JOIN (friendships)
  group('Friend List Queries (Complex)', () => {
    const userId = `user-${Math.floor(Math.random() * 100) + 1}`;

    const response = http.get(`${API_ENDPOINT}/users/${userId}/friends`, {
      tags: { endpoint: 'friend-list' },
    });

    apiDuration.add(response.timings.duration, { endpoint: 'friend-list' });

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 600ms': (r) => r.timings.duration < 600,
    });

    success ? successfulRequests.add(1) : failedRequests.add(1);
    errorRate.add(!success);
  });

  sleep(1);

  // Group 5: Analytics queries
  group('Analytics Queries (Read-Heavy)', () => {
    const response = http.get(`${API_ENDPOINT}/analytics/top-games`, {
      tags: { endpoint: 'analytics' },
    });

    apiDuration.add(response.timings.duration, { endpoint: 'analytics' });

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 800ms': (r) => r.timings.duration < 800,
    });

    success ? successfulRequests.add(1) : failedRequests.add(1);
    errorRate.add(!success);
  });

  sleep(1);
}

// Summary report
export function teardown(data) {
  console.log('========== Load Test Summary ==========');
  console.log(`Total VU max: ${__VU}`);
}

// Check query performance breakdown
export function handleSummary(data) {
  console.log('\n========== PERFORMANCE SUMMARY ==========');
  console.log(`Total Requests: ${data.metrics.http_reqs.value}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.value}`);
  console.log(`Error Rate: ${(errorRate.value * 100).toFixed(2)}%`);
  console.log(`P95 Duration: ${data.metrics.api_duration.values.p(0.95).toFixed(0)}ms`);
  console.log(`P99 Duration: ${data.metrics.api_duration.values.p(0.99).toFixed(0)}ms`);
  console.log(`Max Duration: ${data.metrics.api_duration.values.max}ms`);
  console.log(`Avg Duration: ${data.metrics.api_duration.values.avg.toFixed(0)}ms`);
  console.log('========================================\n');

  return {
    'summary.json': JSON.stringify(data),
  };
}
