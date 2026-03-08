/**
 * Guild Member List Component
 *
 * Displays guild members with role management options.
 */

import { useState } from 'react';
import { useGuild } from '../../contexts/GuildContext';
import { Avatar } from '../Avatar/Avatar';
import type { GuildMember, GuildRole } from '../../types/guild';
import './Guild.css';

interface GuildMemberListProps {
  members: GuildMember[];
  currentUserRole: GuildRole | null;
}

export function GuildMemberList({
  members,
  currentUserRole,
}: GuildMemberListProps) {
  const { kickMember, promoteMember, demoteMember, transferLeadership } = useGuild();
  const [selectedMember, setSelectedMember] = useState<GuildMember | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const canManageMembers = currentUserRole === 'leader' || currentUserRole === 'officer';

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder: Record<GuildRole, number> = { leader: 0, officer: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const getRoleBadge = (role: GuildRole) => {
    switch (role) {
      case 'leader':
        return { icon: '👑', label: 'Leader', className: 'role-leader' };
      case 'officer':
        return { icon: '⭐', label: 'Officer', className: 'role-officer' };
      default:
        return { icon: '', label: 'Member', className: 'role-member' };
    }
  };

  const getActionSheetButtons = () => {
    if (!selectedMember || !currentUserRole) return [];

    const buttons: Array<{
      text: string;
      role?: string;
      handler?: () => void;
    }> = [];

    const isLeader = currentUserRole === 'leader';
    const isOfficer = currentUserRole === 'officer';
    const targetIsLeader = selectedMember.role === 'leader';
    const targetIsOfficer = selectedMember.role === 'officer';

    // Leader can do everything
    if (isLeader && !targetIsLeader) {
      if (!targetIsOfficer) {
        buttons.push({
          text: 'Promote to Officer',
          handler: () => promoteMember(selectedMember.id),
        });
      } else {
        buttons.push({
          text: 'Demote to Member',
          handler: () => demoteMember(selectedMember.id),
        });
      }

      buttons.push({
        text: 'Transfer Leadership',
        handler: () => transferLeadership(selectedMember.id),
      });

      buttons.push({
        text: 'Kick from Guild',
        role: 'destructive',
        handler: () => kickMember(selectedMember.id),
      });
    }

    // Officers can only kick members (not other officers)
    if (isOfficer && !targetIsLeader && !targetIsOfficer) {
      buttons.push({
        text: 'Kick from Guild',
        role: 'destructive',
        handler: () => kickMember(selectedMember.id),
      });
    }

    buttons.push({
      text: 'Cancel',
      role: 'cancel',
    });

    return buttons;
  };

  const formatLastActive = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 5) return 'Online';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="member-list">
      <div className="member-list-header">
        <h3>Guild Members ({members.length})</h3>
      </div>

      <div className="member-grid">
        {sortedMembers.map((member) => {
          const roleBadge = getRoleBadge(member.role);

          return (
            <div
              key={member.id}
              className={`member-card ${roleBadge.className}`}
              onClick={() => {
                if (canManageMembers && member.role !== currentUserRole && member.role !== 'leader') {
                  setSelectedMember(member);
                  setShowActionSheet(true);
                }
              }}
              role={canManageMembers && member.role !== currentUserRole && member.role !== 'leader' ? 'button' : undefined}
              tabIndex={canManageMembers && member.role !== currentUserRole && member.role !== 'leader' ? 0 : undefined}
              aria-label={canManageMembers && member.role !== currentUserRole && member.role !== 'leader' ? `Manage ${member.username}` : undefined}
              onKeyDown={canManageMembers && member.role !== currentUserRole && member.role !== 'leader' ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMember(member);
                  setShowActionSheet(true);
                }
              } : undefined}
            >
              <Avatar
                type={member.avatar.type}
                value={member.avatar.value}
                size="medium"
                isNftHolder={member.avatar.type === 'nft'}
              />

              <div className="member-info">
                <span className="member-name">
                  {roleBadge.icon && <span className="role-icon">{roleBadge.icon}</span>}
                  {member.username}
                </span>
                <span className="member-contribution">
                  {member.weeklyScore.toLocaleString()} pts this week
                </span>
                <span className="member-activity">
                  {formatLastActive(member.lastActiveAt)}
                </span>
              </div>

              {canManageMembers && member.role !== 'leader' && (
                <button className="member-menu-button" type="button" aria-label="Member options">⋮</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Simple Action Menu */}
      {showActionSheet && selectedMember && (
        <div className="action-menu-overlay" onClick={() => { setShowActionSheet(false); setSelectedMember(null); }}>
          <div className="action-menu" onClick={(e) => e.stopPropagation()}>
            <div className="action-menu-header">{selectedMember.username}</div>
            {getActionSheetButtons().map((button) => (
              <button
                key={button.text}
                type="button"
                className={`action-menu-button ${button.role === 'destructive' ? 'destructive' : ''} ${button.role === 'cancel' ? 'cancel' : ''}`}
                onClick={() => {
                  button.handler?.();
                  setShowActionSheet(false);
                  setSelectedMember(null);
                }}
              >
                {button.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GuildMemberList;
