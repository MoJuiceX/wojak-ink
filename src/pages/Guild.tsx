/**
 * Guild Page
 *
 * Main guild page with overview, members, and leaderboard.
 */

import { PageTransition } from '@/components/layout/PageTransition';
import { GuildPage } from '@/components/Guild';
import { PageSEO } from '@/components/seo';

const Guild = () => {
  return (
    <PageTransition>
      <PageSEO
        title="Guild"
        description="Join a Wojak guild, compete with your team, and climb the leaderboard together."
        path="/guild"
      />
      <div className="min-h-full">
        <GuildPage />
      </div>
    </PageTransition>
  );
};

export default Guild;
