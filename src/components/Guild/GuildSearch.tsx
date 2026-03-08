/**
 * Guild Search Component
 *
 * Modal for searching and joining public guilds.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { debounce } from '@/utils/debounce';
import { useGuild } from '../../contexts/GuildContext';
import { GuildCard } from './GuildCard';
import type { Guild } from '../../types/guild';
import './Guild.css';

interface GuildSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuildSearch: React.FC<GuildSearchProps> = ({ isOpen, onClose }) => {
  const { searchGuilds, requestToJoin } = useGuild();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Guild[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const performSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const guilds = await searchGuilds(searchQuery);
        setResults(guilds);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [searchGuilds]
  );

  const handleSearchChange = (value: string) => {
    setQuery(value);
    performSearch(value);
  };

  const handleRequestJoin = async (guild: Guild) => {
    setError(null);
    setIsRequesting(true);

    try {
      await requestToJoin(guild.id);
      setRequestSent(prev => new Set([...prev, guild.id]));
      setSelectedGuild(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSelectedGuild(null);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--color-black-80)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h2
                className="text-lg font-bold text-primary"
              >
                Find a Guild
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-full transition-colors text-muted"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{
                  background: 'var(--color-border)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Search size={18} className="text-muted" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name or tag..."
                  className="flex-1 bg-transparent outline-none text-sm text-primary"
                />
                {isSearching && (
                  <Loader2 size={18} className="animate-spin text-accent" />
                )}
              </div>
            </div>

            {error && (
              <p className="px-4 py-2 text-sm text-error">{error}</p>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {!isSearching && results.length === 0 && query.length >= 2 && (
                <div className="text-center py-8">
                  <span className="text-4xl block mb-2">🔍</span>
                  <p className="text-secondary">
                    No guilds found matching "{query}"
                  </p>
                </div>
              )}

              {!isSearching && query.length < 2 && (
                <div className="text-center py-8">
                  <p className="text-muted">
                    Enter at least 2 characters to search
                  </p>
                </div>
              )}

              {!isSearching && results.map((guild) => (
                <div key={guild.id} className="mb-4">
                  <GuildCard
                    guild={guild}
                    size="medium"
                    onClick={() => setSelectedGuild(guild)}
                  />

                  <div
                    className="flex justify-end px-4 py-3 rounded-b-lg -mt-4"
                    style={{ background: 'var(--color-border)' }}
                  >
                    {requestSent.has(guild.id) ? (
                      <span className="text-sm text-success">
                        Request Sent ✓
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestJoin(guild);
                        }}
                        disabled={isRequesting}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors text-primary"
                        style={{
                          background: 'var(--color-primary)',
                          opacity: isRequesting ? 0.5 : 1,
                        }}
                      >
                        {isRequesting ? 'Sending...' : 'Request to Join'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Guild Detail Overlay */}
            <AnimatePresence>
              {selectedGuild && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center p-4"
                  style={{ background: 'var(--color-black-90)' }}
                  onClick={() => setSelectedGuild(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="rounded-xl w-full max-w-sm overflow-hidden"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GuildCard guild={selectedGuild} size="large" />

                    <div className="p-4 space-y-4">
                      <div>
                        <h4
                          className="text-xs font-medium uppercase tracking-wide mb-2 text-muted"
                        >
                          About
                        </h4>
                        <p
                          className="text-sm text-primary"
                        >
                          {selectedGuild.description || 'No description provided.'}
                        </p>
                      </div>

                      <div
                        className="grid grid-cols-3 gap-1.5 sm:gap-2 p-3 rounded-lg"
                        style={{ background: 'var(--color-border)' }}
                      >
                        <div className="text-center">
                          <p
                            className="text-sm font-semibold text-primary"
                          >
                            {selectedGuild.memberCount}/{selectedGuild.maxMembers}
                          </p>
                          <p
                            className="text-xs text-muted"
                          >
                            Members
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className="text-sm font-semibold text-primary"
                          >
                            {selectedGuild.totalScore.toLocaleString()}
                          </p>
                          <p
                            className="text-xs text-muted"
                          >
                            Total Score
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className="text-sm font-semibold text-primary"
                          >
                            {selectedGuild.weeklyScore.toLocaleString()}
                          </p>
                          <p
                            className="text-xs text-muted"
                          >
                            Weekly
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {requestSent.has(selectedGuild.id) ? (
                          <div
                            className="text-center p-4 rounded-lg"
                            style={{
                              background: 'var(--color-success-10)',
                              border: '1px solid var(--color-success-30)',
                            }}
                          >
                            <span className="font-semibold text-success">
                              Request Sent
                            </span>
                            <p
                              className="text-sm mt-1 text-muted"
                            >
                              Waiting for approval from guild officers
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRequestJoin(selectedGuild)}
                            disabled={isRequesting || selectedGuild.memberCount >= selectedGuild.maxMembers}
                            className="w-full py-3 rounded-lg font-medium transition-colors text-primary"
                            style={{
                              background: 'var(--color-primary)',
                              opacity: (isRequesting || selectedGuild.memberCount >= selectedGuild.maxMembers) ? 0.5 : 1,
                            }}
                          >
                            {isRequesting ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 size={18} className="animate-spin" />
                                Sending...
                              </span>
                            ) : selectedGuild.memberCount >= selectedGuild.maxMembers ? (
                              'Guild is Full'
                            ) : (
                              'Request to Join'
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedGuild(null)}
                          className="w-full py-3 rounded-lg font-medium transition-colors text-secondary"
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          Back to Results
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuildSearch;
