// Cloudflare Worker - Environment Configuration
// This worker serves as the entry point for edge computing

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    console.log(`[${env.ENV}] ${request.method} ${url.pathname}`);
    
    // Add logging and tracing
    const traceId = crypto.randomUUID();
    const headers = new Headers(request.headers);
    headers.set('x-trace-id', traceId);
    headers.set('x-environment', env.ENV);
    
    return new Response('Worker initialized with environment config', {
      headers: {
        'x-trace-id': traceId,
        'x-environment': env.ENV
      }
    });
  },
  
  async scheduled(event, env) {
    // Scheduled tasks (e.g., cleanup, monitoring)
    console.log(`[Scheduled] Running at ${new Date().toISOString()}`);
  }
};
