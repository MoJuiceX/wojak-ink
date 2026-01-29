/* eslint-disable react-refresh/only-export-components */
/**
 * Guild Context
 *
 * Manages guild state, membership, and operations.
 * Uses localStorage for demo mode (will be replaced with backend API).
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type {
  Guild,
  GuildMember,
  GuildInvite,
  GuildJoinRequest,
  GuildActivity,
  GuildActivityType,
  CreateGuildData,
  GuildSettings,
  GuildLeaderboardEntry,
  GuildRole,
} from '../types/guild';
import { GUILD_CONSTANTS, getLevelFromXp } from '../types/guild';

// Storage keys
const GUILDS_KEY = 'wojak_guilds';
const GUILD_MEMBERS_KEY = 'wojak_guild_members';
const GUILD_INVITES_KEY = 'wojak_guild_invites';
const GUILD_REQUESTS_KEY = 'wojak_guild_requests';
const GUILD_ACTIVITY_KEY = 'wojak_guild_activity';
const USER_GUILD_KEY = 'wojak_user_guild';

interface GuildContextType {
  // Current user's guild
  myGuild: Guild | null;
  myGuildMembers: GuildMember[];
  myRole: GuildRole | null;

  // Loading states
  isLoading: boolean;

  // Guild management
  createGuild: (data: CreateGuildData) => Promise<Guild>;
  leaveGuild: () => Promise<void>;
  disbandGuild: () => Promise<void>;
  updateGuildSettings: (settings: GuildSettings) => Promise<void>;

  // Member management
  inviteMember: (userId: string) => Promise<GuildInvite>;
  kickMember: (memberId: string) => Promise<void>;
  promoteMember: (memberId: string) => Promise<void>;
  demoteMember: (memberId: string) => Promise<void>;
  transferLeadership: (memberId: string) => Promise<void>;

  // Join requests
  pendingRequests: GuildJoinRequest[];
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;

  // Invites (for the user)
  myInvites: GuildInvite[];
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;

  // Public guilds
  searchGuilds: (query: string) => Promise<Guild[]>;
  requestToJoin: (guildId: string, message?: string) => Promise<void>;

  // Activity
  guildActivity: GuildActivity[];

  // Leaderboard
  fetchGuildLeaderboard: (timeframe: 'weekly' | 'all-time') => Promise<GuildLeaderboardEntry[]>;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

export const GuildProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [myGuildMembers, setMyGuildMembers] = useState<GuildMember[]>([]);
  const [myRole, setMyRole] = useState<GuildRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<GuildJoinRequest[]>([]);
  const [myInvites, setMyInvites] = useState<GuildInvite[]>([]);
  const [guildActivity, setGuildActivity] = useState<GuildActivity[]>([]);

  // Helper functions for localStorage
  const getGuilds = useCallback((): Record<string, Guild> => {
    try {
      return JSON.parse(localStorage.getItem(GUILDS_KEY) || '{}');
    } catch {
      return {};
    }
  }, []);

  const saveGuilds = useCallback((guilds: Record<string, Guild>) => {
    localStorage.setItem(GUILDS_KEY, JSON.stringify(guilds));
  }, []);

  const getGuildMembers = useCallback((guildId: string): GuildMember[] => {
    try {
      const allMembers = JSON.parse(localStorage.getItem(GUILD_MEMBERS_KEY) || '{}');
      return allMembers[guildId] || [];
    } catch {
      return [];
    }
  }, []);

  const saveGuildMembers = useCallback((guildId: string, members: GuildMember[]) => {
    const allMembers = JSON.parse(localStorage.getItem(GUILD_MEMBERS_KEY) || '{}');
    allMembers[guildId] = members;
    localStorage.setItem(GUILD_MEMBERS_KEY, JSON.stringify(allMembers));
  }, []);

  const getUserGuildId = useCallback((userId: string): string | null => {
    try {
      const userGuilds = JSON.parse(localStorage.getItem(USER_GUILD_KEY) || '{}');
      return userGuilds[userId] || null;
    } catch {
      return null;
    }
  }, []);

  const setUserGuildId = useCallback((userId: string, guildId: string | null) => {
    const userGuilds = JSON.parse(localStorage.getItem(USER_GUILD_KEY) || '{}');
    if (guildId) {
      userGuilds[userId] = guildId;
    } else {
      delete userGuilds[userId];
    }
    localStorage.setItem(USER_GUILD_KEY, JSON.stringify(userGuilds));
  }, []);

  const addGuildActivity = useCallback((
    guildId: string,
    type: GuildActivityType,
    userId: string,
    username: string,
    data: Record<string, unknown> = {}
  ) => {
    const allActivity = JSON.parse(localStorage.getItem(GUILD_ACTIVITY_KEY) || '{}');
    const guildActivities = allActivity[guildId] || [];

    const newActivity: GuildActivity = {
      id: crypto.randomUUID(),
      type,
      userId,
      username,
      data,
      createdAt: new Date(),
    };

    guildActivities.unshift(newActivity);
    allActivity[guildId] = guildActivities.slice(0, 50); // Keep last 50 activities
    localStorage.setItem(GUILD_ACTIVITY_KEY, JSON.stringify(allActivity));

    if (myGuild?.id === guildId) {
      setGuildActivity(allActivity[guildId]);
    }
  }, [myGuild?.id]);

  // Fetch user's guild on mount/user change
  useEffect(() => {
    if (user) {
      fetchMyGuild();
      fetchMyInvites();
    } else {
      setMyGuild(null);
      setMyGuildMembers([]);
      setMyRole(null);
      setIsLoading(false);
    }
  }, [user]);

  const fetchMyGuild = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));

      const guildId = getUserGuildId(user.id);
      if (!guildId) {
        setMyGuild(null);
        setMyGuildMembers([]);
        setMyRole(null);
        return;
      }

      const guilds = getGuilds();
      const guild = guilds[guildId];

      if (!guild) {
        setUserGuildId(user.id, null);
        setMyGuild(null);
        setMyGuildMembers([]);
        setMyRole(null);
        return;
      }

      const members = getGuildMembers(guildId);
      const myMember = members.find(m => m.userId === user.id);

      setMyGuild(guild);
      setMyGuildMembers(members);
      setMyRole(myMember?.role || null);

      // Load activity
      const allActivity = JSON.parse(localStorage.getItem(GUILD_ACTIVITY_KEY) || '{}');
      setGuildActivity(allActivity[guildId] || []);

      // Load pending requests if leader/officer
      if (myMember?.role === 'leader' || myMember?.role === 'officer') {
        const allRequests = JSON.parse(localStorage.getItem(GUILD_REQUESTS_KEY) || '{}');
        setPendingRequests((allRequests[guildId] || []).filter((r: GuildJoinRequest) => r.status === 'pending'));
      }
    } catch (error) {
      console.error('Failed to fetch guild:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getUserGuildId, getGuilds, getGuildMembers, setUserGuildId]);

  const fetchMyInvites = useCallback(async () => {
    if (!user) return;

    try {
      const allInvites = JSON.parse(localStorage.getItem(GUILD_INVITES_KEY) || '{}');
      const userInvites = (allInvites[user.id] || []).filter(
        (i: GuildInvite) => i.status === 'pending' && new Date(i.expiresAt) > new Date()
      );
      setMyInvites(userInvites);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  }, [user]);

  // Create a new guild
  const createGuild = useCallback(async (data: CreateGuildData): Promise<Guild> => {
    if (!user) throw new Error('Must be logged in');

    // Check if user is already in a guild
    const existingGuildId = getUserGuildId(user.id);
    if (existingGuildId) {
      throw new Error('You are already in a guild');
    }

    // Check if tag is taken
    const guilds = getGuilds();
    const tagTaken = Object.values(guilds).some(g => g.tag.toLowerCase() === data.tag.toLowerCase());
    if (tagTaken) {
      throw new Error('Guild tag is already taken');
    }

    const guildId = crypto.randomUUID();
    const levelInfo = getLevelFromXp(0);

    const newGuild: Guild = {
      id: guildId,
      name: data.name,
      tag: data.tag.toUpperCase(),
      description: data.description,
      banner: data.banner,
      createdAt: new Date(),
      level: levelInfo.level,
      xp: 0,
      xpToNextLevel: levelInfo.xpToNextLevel,
      totalScore: 0,
      weeklyScore: 0,
      memberCount: 1,
      maxMembers: GUILD_CONSTANTS.MAX_MEMBERS,
      isPublic: data.isPublic,
      minLevelToJoin: 0,
      rank: null,
      weeklyRank: null,
    };

    // Save guild
    guilds[guildId] = newGuild;
    saveGuilds(guilds);

    // Create leader member
    const leaderMember: GuildMember = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username || user.displayName,
      displayName: user.displayName,
      avatar: user.avatar,
      role: 'leader',
      joinedAt: new Date(),
      weeklyScore: 0,
      totalScore: 0,
      gamesPlayedThisWeek: 0,
      lastActiveAt: new Date(),
    };

    saveGuildMembers(guildId, [leaderMember]);
    setUserGuildId(user.id, guildId);

    // Add activity
    addGuildActivity(guildId, 'member_joined', user.id, leaderMember.username, { isFounder: true });

    await fetchMyGuild();
    return newGuild;
  }, [user, getUserGuildId, getGuilds, saveGuilds, saveGuildMembers, setUserGuildId, addGuildActivity, fetchMyGuild]);

  // Leave current guild
  const leaveGuild = useCallback(async () => {
    if (!user || !myGuild) return;

    if (myRole === 'leader') {
      throw new Error('Leaders must transfer leadership or disband the guild');
    }

    const members = getGuildMembers(myGuild.id);
    const updatedMembers = members.filter(m => m.userId !== user.id);
    saveGuildMembers(myGuild.id, updatedMembers);

    // Update guild member count
    const guilds = getGuilds();
    if (guilds[myGuild.id]) {
      guilds[myGuild.id].memberCount = updatedMembers.length;
      saveGuilds(guilds);
    }

    // Remove user from guild
    setUserGuildId(user.id, null);

    // Add activity
    addGuildActivity(myGuild.id, 'member_left', user.id, user.username || 'Unknown');

    setMyGuild(null);
    setMyGuildMembers([]);
    setMyRole(null);
  }, [user, myGuild, myRole, getGuildMembers, saveGuildMembers, getGuilds, saveGuilds, setUserGuildId, addGuildActivity]);

  // Disband guild (leader only)
  const disbandGuild = useCallback(async () => {
    if (!user || !myGuild || myRole !== 'leader') return;

    const members = getGuildMembers(myGuild.id);

    // Remove all members from guild
    members.forEach(m => {
      setUserGuildId(m.userId, null);
    });

    // Delete guild data
    const guilds = getGuilds();
    delete guilds[myGuild.id];
    saveGuilds(guilds);

    // Clear members
    const allMembers = JSON.parse(localStorage.getItem(GUILD_MEMBERS_KEY) || '{}');
    delete allMembers[myGuild.id];
    localStorage.setItem(GUILD_MEMBERS_KEY, JSON.stringify(allMembers));

    setMyGuild(null);
    setMyGuildMembers([]);
    setMyRole(null);
  }, [user, myGuild, myRole, getGuildMembers, setUserGuildId, getGuilds, saveGuilds]);

  // Update guild settings
  const updateGuildSettings = useCallback(async (settings: GuildSettings) => {
    if (!myGuild || (myRole !== 'leader' && myRole !== 'officer')) return;

    const guilds = getGuilds();
    if (guilds[myGuild.id]) {
      guilds[myGuild.id] = {
        ...guilds[myGuild.id],
        isPublic: settings.isPublic,
        minLevelToJoin: settings.minLevelToJoin,
        description: settings.description,
        banner: settings.banner,
      };
      saveGuilds(guilds);
      await fetchMyGuild();
    }
  }, [myGuild, myRole, getGuilds, saveGuilds, fetchMyGuild]);

  // Invite a member
  const inviteMember = useCallback(async (userId: string): Promise<GuildInvite> => {
    if (!user || !myGuild) throw new Error('Not in a guild');
    if (myRole !== 'leader' && myRole !== 'officer') throw new Error('No permission');

    const allInvites = JSON.parse(localStorage.getItem(GUILD_INVITES_KEY) || '{}');
    const userInvites = allInvites[userId] || [];

    // Check if already invited
    const existingInvite = userInvites.find(
      (i: GuildInvite) => i.guildId === myGuild.id && i.status === 'pending'
    );
    if (existingInvite) {
      throw new Error('User already has a pending invite');
    }

    const invite: GuildInvite = {
      id: crypto.randomUUID(),
      guildId: myGuild.id,
      guildName: myGuild.name,
      guildTag: myGuild.tag,
      invitedBy: user.username || user.displayName,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + GUILD_CONSTANTS.INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      status: 'pending',
    };

    userInvites.push(invite);
    allInvites[userId] = userInvites;
    localStorage.setItem(GUILD_INVITES_KEY, JSON.stringify(allInvites));

    return invite;
  }, [user, myGuild, myRole]);

  // Kick a member
  const kickMember = useCallback(async (memberId: string) => {
    if (!myGuild || (myRole !== 'leader' && myRole !== 'officer')) return;

    const members = getGuildMembers(myGuild.id);
    const memberToKick = members.find(m => m.id === memberId);

    if (!memberToKick) return;
    if (memberToKick.role === 'leader') throw new Error('Cannot kick the leader');
    if (memberToKick.role === 'officer' && myRole !== 'leader') throw new Error('Only leader can kick officers');

    const updatedMembers = members.filter(m => m.id !== memberId);
    saveGuildMembers(myGuild.id, updatedMembers);

    // Update guild member count
    const guilds = getGuilds();
    if (guilds[myGuild.id]) {
      guilds[myGuild.id].memberCount = updatedMembers.length;
      saveGuilds(guilds);
    }

    // Remove user from guild
    setUserGuildId(memberToKick.userId, null);

    addGuildActivity(myGuild.id, 'member_left', memberToKick.userId, memberToKick.username, { kicked: true });

    await fetchMyGuild();
  }, [myGuild, myRole, getGuildMembers, saveGuildMembers, getGuilds, saveGuilds, setUserGuildId, addGuildActivity, fetchMyGuild]);

  // Promote member to officer
  const promoteMember = useCallback(async (memberId: string) => {
    if (!myGuild || myRole !== 'leader') return;

    const members = getGuildMembers(myGuild.id);
    const memberIndex = members.findIndex(m => m.id === memberId);

    if (memberIndex === -1) return;
    if (members[memberIndex].role !== 'member') return;

    // Check officer limit
    const officerCount = members.filter(m => m.role === 'officer').length;
    if (officerCount >= GUILD_CONSTANTS.MAX_OFFICERS) {
      throw new Error('Maximum number of officers reached');
    }

    members[memberIndex].role = 'officer';
    saveGuildMembers(myGuild.id, members);

    addGuildActivity(myGuild.id, 'member_promoted', members[memberIndex].userId, members[memberIndex].username);

    await fetchMyGuild();
  }, [myGuild, myRole, getGuildMembers, saveGuildMembers, addGuildActivity, fetchMyGuild]);

  // Demote officer to member
  const demoteMember = useCallback(async (memberId: string) => {
    if (!myGuild || myRole !== 'leader') return;

    const members = getGuildMembers(myGuild.id);
    const memberIndex = members.findIndex(m => m.id === memberId);

    if (memberIndex === -1) return;
    if (members[memberIndex].role !== 'officer') return;

    members[memberIndex].role = 'member';
    saveGuildMembers(myGuild.id, members);

    addGuildActivity(myGuild.id, 'member_demoted', members[memberIndex].userId, members[memberIndex].username);

    await fetchMyGuild();
  }, [myGuild, myRole, getGuildMembers, saveGuildMembers, addGuildActivity, fetchMyGuild]);

  // Transfer leadership
  const transferLeadership = useCallback(async (memberId: string) => {
    if (!user || !myGuild || myRole !== 'leader') return;

    const members = getGuildMembers(myGuild.id);
    const currentLeaderIndex = members.findIndex(m => m.userId === user.id);
    const newLeaderIndex = members.findIndex(m => m.id === memberId);

    if (currentLeaderIndex === -1 || newLeaderIndex === -1) return;

    members[currentLeaderIndex].role = 'officer';
    members[newLeaderIndex].role = 'leader';

    saveGuildMembers(myGuild.id, members);

    addGuildActivity(myGuild.id, 'member_promoted', members[newLeaderIndex].userId, members[newLeaderIndex].username, {
      newRole: 'leader',
    });

    await fetchMyGuild();
  }, [user, myGuild, myRole, getGuildMembers, saveGuildMembers, addGuildActivity, fetchMyGuild]);

  // Accept join request
  const acceptRequest = useCallback(async (requestId: string) => {
    if (!user || !myGuild) return;

    const allRequests = JSON.parse(localStorage.getItem(GUILD_REQUESTS_KEY) || '{}');
    const guildRequests = allRequests[myGuild.id] || [];
    const requestIndex = guildRequests.findIndex((r: GuildJoinRequest) => r.id === requestId);

    if (requestIndex === -1) return;

    const request = guildRequests[requestIndex];

    // Check member limit
    if (myGuild.memberCount >= myGuild.maxMembers) {
      throw new Error('Guild is full');
    }

    // Add member
    const members = getGuildMembers(myGuild.id);
    const allUsers = JSON.parse(localStorage.getItem('wojak_users') || '{}');
    const requestUser = Object.values(allUsers).find((u: unknown) => (u as { id?: string }).id === request.userId) as { displayName?: string } | undefined;

    const newMember: GuildMember = {
      id: crypto.randomUUID(),
      userId: request.userId,
      username: request.username,
      displayName: requestUser?.displayName || request.username,
      avatar: request.avatar,
      role: 'member',
      joinedAt: new Date(),
      weeklyScore: 0,
      totalScore: 0,
      gamesPlayedThisWeek: 0,
      lastActiveAt: new Date(),
    };

    members.push(newMember);
    saveGuildMembers(myGuild.id, members);

    // Update guild member count
    const guilds = getGuilds();
    if (guilds[myGuild.id]) {
      guilds[myGuild.id].memberCount = members.length;
      saveGuilds(guilds);
    }

    // Set user's guild
    setUserGuildId(request.userId, myGuild.id);

    // Update request status
    guildRequests[requestIndex].status = 'accepted';
    allRequests[myGuild.id] = guildRequests;
    localStorage.setItem(GUILD_REQUESTS_KEY, JSON.stringify(allRequests));

    addGuildActivity(myGuild.id, 'member_joined', request.userId, request.username);

    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    await fetchMyGuild();
  }, [user, myGuild, getGuildMembers, saveGuildMembers, getGuilds, saveGuilds, setUserGuildId, addGuildActivity, fetchMyGuild]);

  // Decline join request
  const declineRequest = useCallback(async (requestId: string) => {
    if (!myGuild) return;

    const allRequests = JSON.parse(localStorage.getItem(GUILD_REQUESTS_KEY) || '{}');
    const guildRequests = allRequests[myGuild.id] || [];
    const requestIndex = guildRequests.findIndex((r: GuildJoinRequest) => r.id === requestId);

    if (requestIndex === -1) return;

    guildRequests[requestIndex].status = 'declined';
    allRequests[myGuild.id] = guildRequests;
    localStorage.setItem(GUILD_REQUESTS_KEY, JSON.stringify(allRequests));

    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, [myGuild]);

  // Accept invite
  const acceptInvite = useCallback(async (inviteId: string) => {
    if (!user) return;

    const allInvites = JSON.parse(localStorage.getItem(GUILD_INVITES_KEY) || '{}');
    const userInvites = allInvites[user.id] || [];
    const inviteIndex = userInvites.findIndex((i: GuildInvite) => i.id === inviteId);

    if (inviteIndex === -1) return;

    const invite = userInvites[inviteIndex];
    const guilds = getGuilds();
    const guild = guilds[invite.guildId];

    if (!guild) {
      throw new Error('Guild no longer exists');
    }

    if (guild.memberCount >= guild.maxMembers) {
      throw new Error('Guild is full');
    }

    // Add member
    const members = getGuildMembers(invite.guildId);
    const newMember: GuildMember = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username || user.displayName,
      displayName: user.displayName,
      avatar: user.avatar,
      role: 'member',
      joinedAt: new Date(),
      weeklyScore: 0,
      totalScore: 0,
      gamesPlayedThisWeek: 0,
      lastActiveAt: new Date(),
    };

    members.push(newMember);
    saveGuildMembers(invite.guildId, members);

    // Update guild member count
    guilds[invite.guildId].memberCount = members.length;
    saveGuilds(guilds);

    // Set user's guild
    setUserGuildId(user.id, invite.guildId);

    // Update invite status
    userInvites[inviteIndex].status = 'accepted';
    allInvites[user.id] = userInvites;
    localStorage.setItem(GUILD_INVITES_KEY, JSON.stringify(allInvites));

    addGuildActivity(invite.guildId, 'member_joined', user.id, newMember.username);

    setMyInvites(prev => prev.filter(i => i.id !== inviteId));
    await fetchMyGuild();
  }, [user, getGuilds, getGuildMembers, saveGuildMembers, saveGuilds, setUserGuildId, addGuildActivity, fetchMyGuild]);

  // Decline invite
  const declineInvite = useCallback(async (inviteId: string) => {
    if (!user) return;

    const allInvites = JSON.parse(localStorage.getItem(GUILD_INVITES_KEY) || '{}');
    const userInvites = allInvites[user.id] || [];
    const inviteIndex = userInvites.findIndex((i: GuildInvite) => i.id === inviteId);

    if (inviteIndex === -1) return;

    userInvites[inviteIndex].status = 'declined';
    allInvites[user.id] = userInvites;
    localStorage.setItem(GUILD_INVITES_KEY, JSON.stringify(allInvites));

    setMyInvites(prev => prev.filter(i => i.id !== inviteId));
  }, [user]);

  // Search public guilds
  const searchGuilds = useCallback(async (query: string): Promise<Guild[]> => {
    const guilds = getGuilds();
    const queryLower = query.toLowerCase();

    return Object.values(guilds)
      .filter(g =>
        g.isPublic &&
        (g.name.toLowerCase().includes(queryLower) || g.tag.toLowerCase().includes(queryLower))
      )
      .sort((a, b) => b.memberCount - a.memberCount);
  }, [getGuilds]);

  // Request to join a guild
  const requestToJoin = useCallback(async (guildId: string, message?: string) => {
    if (!user) throw new Error('Must be logged in');

    const existingGuildId = getUserGuildId(user.id);
    if (existingGuildId) {
      throw new Error('You are already in a guild');
    }

    const allRequests = JSON.parse(localStorage.getItem(GUILD_REQUESTS_KEY) || '{}');
    const guildRequests = allRequests[guildId] || [];

    // Check for existing pending request
    const existingRequest = guildRequests.find(
      (r: GuildJoinRequest) => r.userId === user.id && r.status === 'pending'
    );
    if (existingRequest) {
      throw new Error('You already have a pending request');
    }

    const request: GuildJoinRequest = {
      id: crypto.randomUUID(),
      userId: user.id,
      username: user.username || user.displayName,
      avatar: user.avatar,
      message: message || '',
      requestedAt: new Date(),
      status: 'pending',
    };

    guildRequests.push(request);
    allRequests[guildId] = guildRequests;
    localStorage.setItem(GUILD_REQUESTS_KEY, JSON.stringify(allRequests));
  }, [user, getUserGuildId]);

  // Fetch guild leaderboard
  const fetchGuildLeaderboard = useCallback(async (
    timeframe: 'weekly' | 'all-time'
  ): Promise<GuildLeaderboardEntry[]> => {
    const guilds = getGuilds();

    const entries: GuildLeaderboardEntry[] = Object.values(guilds)
      .map(guild => {
        const members = getGuildMembers(guild.id);
        const topContributor = members.reduce(
          (top, m) => {
            const score = timeframe === 'weekly' ? m.weeklyScore : m.totalScore;
            return score > top.score ? { username: m.username, score } : top;
          },
          { username: 'N/A', score: 0 }
        );

        return {
          rank: 0,
          guild: {
            id: guild.id,
            name: guild.name,
            tag: guild.tag,
            banner: guild.banner,
            level: guild.level,
          },
          totalScore: guild.totalScore,
          weeklyScore: guild.weeklyScore,
          memberCount: guild.memberCount,
          topContributor,
        };
      })
      .sort((a, b) => {
        const scoreA = timeframe === 'weekly' ? a.weeklyScore : a.totalScore;
        const scoreB = timeframe === 'weekly' ? b.weeklyScore : b.totalScore;
        return scoreB - scoreA;
      })
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return entries;
  }, [getGuilds, getGuildMembers]);

  return (
    <GuildContext.Provider
      value={{
        myGuild,
        myGuildMembers,
        myRole,
        isLoading,
        createGuild,
        leaveGuild,
        disbandGuild,
        updateGuildSettings,
        inviteMember,
        kickMember,
        promoteMember,
        demoteMember,
        transferLeadership,
        pendingRequests,
        acceptRequest,
        declineRequest,
        myInvites,
        acceptInvite,
        declineInvite,
        searchGuilds,
        requestToJoin,
        guildActivity,
        fetchGuildLeaderboard,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
};

export const useGuild = () => {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within GuildProvider');
  }
  return context;
};
