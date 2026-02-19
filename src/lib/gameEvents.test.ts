import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatEvent,
  timeAgo,
  EVENT_ICONS,
  EVENT_LINKS,
  type ActivityEvent,
} from './gameEvents';

// ============ Helpers ============

function makeEvent(
  eventType: string,
  eventData: Record<string, unknown> = {},
  id = 1,
): ActivityEvent {
  return {
    id,
    eventType,
    eventData,
    createdAt: new Date().toISOString(),
  };
}

// ============ EVENT_ICONS ============

describe('EVENT_ICONS', () => {
  it('contains an icon for battle_won', () => {
    expect(EVENT_ICONS.battle_won).toBeDefined();
  });

  it('contains an icon for battle_lost', () => {
    expect(EVENT_ICONS.battle_lost).toBeDefined();
  });

  it('contains an icon for leaderboard_change', () => {
    expect(EVENT_ICONS.leaderboard_change).toBeDefined();
  });

  it('contains an icon for burn', () => {
    expect(EVENT_ICONS.burn).toBeDefined();
  });

  it('contains an icon for mint', () => {
    expect(EVENT_ICONS.mint).toBeDefined();
  });

  it('battle_won and battle_lost share the same icon component', () => {
    expect(EVENT_ICONS.battle_won).toBe(EVENT_ICONS.battle_lost);
  });

  it('covers all 9 known event types', () => {
    const knownTypes = [
      'battle_won', 'battle_lost', 'battle_draw', 'battle_started',
      'leaderboard_change', 'vote_milestone', 'burn', 'mint', 'streak_milestone',
    ];
    for (const type of knownTypes) {
      expect(EVENT_ICONS[type], `missing icon for ${type}`).toBeDefined();
    }
  });
});

// ============ EVENT_LINKS ============

describe('EVENT_LINKS', () => {
  it('battle_won links to /swipe/battles', () => {
    expect(EVENT_LINKS.battle_won).toBe('/swipe/battles');
  });

  it('leaderboard_change links to /swipe/leaderboard', () => {
    expect(EVENT_LINKS.leaderboard_change).toBe('/swipe/leaderboard');
  });

  it('mint links to /generator', () => {
    expect(EVENT_LINKS.mint).toBe('/generator');
  });

  it('burn links to /swipe/dashboard', () => {
    expect(EVENT_LINKS.burn).toBe('/swipe/dashboard');
  });

  it('vote_milestone links to /swipe', () => {
    expect(EVENT_LINKS.vote_milestone).toBe('/swipe');
  });

  it('all link values are non-empty strings starting with /', () => {
    for (const [type, link] of Object.entries(EVENT_LINKS)) {
      expect(typeof link, `link for ${type} is not a string`).toBe('string');
      expect(link.startsWith('/'), `link for ${type} does not start with /`).toBe(true);
    }
  });
});

// ============ formatEvent ============

describe('formatEvent — battle events', () => {
  it('formats battle_won with vote counts', () => {
    const event = makeEvent('battle_won', { votes: 10, opponentVotes: 3 });
    expect(formatEvent(event)).toBe('Won battle! (10-3 votes)');
  });

  it('formats battle_lost with vote counts', () => {
    const event = makeEvent('battle_lost', { votes: 2, opponentVotes: 8 });
    expect(formatEvent(event)).toBe('Lost battle (2-8 votes)');
  });

  it('formats battle_draw', () => {
    const event = makeEvent('battle_draw');
    expect(formatEvent(event)).toBe('Battle ended in a draw');
  });

  it('formats battle_started', () => {
    const event = makeEvent('battle_started');
    expect(formatEvent(event)).toBe('Battle started!');
  });
});

describe('formatEvent — leaderboard_change', () => {
  it('includes the rank number', () => {
    const event = makeEvent('leaderboard_change', { rank: 5 });
    expect(formatEvent(event)).toBe('Moved to rank #5 on the leaderboard');
  });

  it('shows "?" when rank is missing', () => {
    const event = makeEvent('leaderboard_change', {});
    expect(formatEvent(event)).toBe('Moved to rank #? on the leaderboard');
  });
});

describe('formatEvent — vote_milestone', () => {
  it('shows first vote message for "first_vote" milestone', () => {
    const event = makeEvent('vote_milestone', { milestone: 'first_vote' });
    expect(formatEvent(event)).toBe('Cast your first vote!');
  });

  it('shows total vote count for other milestones', () => {
    const event = makeEvent('vote_milestone', { milestone: 'count', count: 100 });
    expect(formatEvent(event)).toBe('Reached 100 total votes');
  });

  it('shows "?" for count when count is missing', () => {
    const event = makeEvent('vote_milestone', { milestone: 'count' });
    expect(formatEvent(event)).toBe('Reached ? total votes');
  });
});

describe('formatEvent — burn', () => {
  it('includes the edition number and credits earned', () => {
    const event = makeEvent('burn', { editionNumber: 42, creditsEarned: 500 });
    expect(formatEvent(event)).toBe('Burned Wojak #42 (+5 credits)');
  });

  it('shows "?" for edition number when missing', () => {
    const event = makeEvent('burn', { creditsEarned: 200 });
    expect(formatEvent(event)).toBe('Burned Wojak #? (+2 credits)');
  });

  it('floors fractional credits', () => {
    const event = makeEvent('burn', { editionNumber: 1, creditsEarned: 350 });
    expect(formatEvent(event)).toBe('Burned Wojak #1 (+3 credits)');
  });
});

describe('formatEvent — mint', () => {
  it('includes the edition number', () => {
    const event = makeEvent('mint', { editionNumber: 7 });
    expect(formatEvent(event)).toBe('Minted Wojak #7');
  });

  it('shows "?" for edition number when missing', () => {
    const event = makeEvent('mint', {});
    expect(formatEvent(event)).toBe('Minted Wojak #?');
  });
});

describe('formatEvent — streak_milestone', () => {
  it('includes the day count and credits earned', () => {
    const event = makeEvent('streak_milestone', { days: 7, credits: 300 });
    expect(formatEvent(event)).toBe('7-day vote streak! (+3 credits)');
  });

  it('floors fractional credits', () => {
    const event = makeEvent('streak_milestone', { days: 3, credits: 150 });
    expect(formatEvent(event)).toBe('3-day vote streak! (+1 credits)');
  });
});

describe('formatEvent — unknown type', () => {
  it('returns "New activity" for unrecognised event types', () => {
    const event = makeEvent('some_future_event');
    expect(formatEvent(event)).toBe('New activity');
  });
});

// ============ timeAgo ============

describe('timeAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for a date less than 1 minute ago', () => {
    vi.useFakeTimers();
    const now = new Date('2025-01-01T12:00:00Z');
    vi.setSystemTime(now);

    const date = new Date('2025-01-01T11:59:45Z').toISOString();
    expect(timeAgo(date)).toBe('just now');
  });

  it('returns minutes for a date 5 minutes ago', () => {
    vi.useFakeTimers();
    const now = new Date('2025-01-01T12:00:00Z');
    vi.setSystemTime(now);

    const date = new Date('2025-01-01T11:55:00Z').toISOString();
    expect(timeAgo(date)).toBe('5m ago');
  });

  it('returns hours for a date 3 hours ago', () => {
    vi.useFakeTimers();
    const now = new Date('2025-01-01T12:00:00Z');
    vi.setSystemTime(now);

    const date = new Date('2025-01-01T09:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('3h ago');
  });

  it('returns days for a date 2 days ago', () => {
    vi.useFakeTimers();
    const now = new Date('2025-01-03T12:00:00Z');
    vi.setSystemTime(now);

    const date = new Date('2025-01-01T12:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('2d ago');
  });

  it('returns "1m ago" for exactly 60 seconds ago', () => {
    vi.useFakeTimers();
    const now = new Date('2025-01-01T12:01:00Z');
    vi.setSystemTime(now);

    const date = new Date('2025-01-01T12:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('1m ago');
  });
});
