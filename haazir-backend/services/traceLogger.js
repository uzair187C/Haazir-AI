/**
 * Agent Trace Logger — Logs every AI decision for hackathon submission
 * 
 * Each trace follows the OODA format:
 * - Observation: What the agent saw/received
 * - Inference: What it concluded from the observation
 * - Decision: What action it chose
 * - Action: What it actually did
 * - Outcome: The result
 */

// In-memory trace store (exports to JSON for submission)
const traces = [];

function logTrace(agentName, bookingId, trace) {
  const entry = {
    id: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    agent: agentName,
    bookingId: bookingId || 'system',
    timestamp: new Date().toISOString(),
    observation: trace.observation || '',
    inference: trace.inference || '',
    decision: trace.decision || '',
    action: trace.action || '',
    outcome: trace.outcome || '',
    reasoning: trace.reasoning || '',
    confidence: trace.confidence || null,
    metadata: trace.metadata || {},
  };

  traces.push(entry);
  console.log(`[TRACE] ${agentName} | ${entry.decision}`);
  return entry;
}

function getTraces(bookingId) {
  if (bookingId) {
    return traces.filter(t => t.bookingId === bookingId);
  }
  return traces;
}

function exportTracesJSON() {
  return JSON.stringify(traces, null, 2);
}

function getTracesSummary() {
  const byAgent = {};
  traces.forEach(t => {
    if (!byAgent[t.agent]) byAgent[t.agent] = 0;
    byAgent[t.agent]++;
  });
  return {
    totalTraces: traces.length,
    byAgent,
    timeRange: traces.length > 0 ? {
      first: traces[0].timestamp,
      last: traces[traces.length - 1].timestamp,
    } : null,
  };
}

module.exports = { logTrace, getTraces, exportTracesJSON, getTracesSummary };
