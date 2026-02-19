/**
 * Shop Page — Coming Soon
 *
 * Polished placeholder for launch. The ShopComponent is preserved
 * for post-launch but not rendered here.
 */

import { PageTransition } from '@/components/layout/PageTransition';
import { PageSEO } from '@/components/seo';

const PREVIEW_ITEMS = [
  { icon: '🖼️', name: 'Profile Frames', desc: 'Stand out in the community' },
  { icon: '💬', name: 'Chat Badges', desc: 'Flex in the chat rooms' },
  { icon: '🎨', name: 'Generator Unlocks', desc: 'Exclusive layers and colors' },
  { icon: '✨', name: 'Custom Effects', desc: 'Make your Wojak glow' },
];

const Shop = () => {
  return (
    <PageTransition>
      <PageSEO
        title="Shop"
        description="Buy credits, power-ups, and exclusive items for your Wojak experience."
        path="/shop"
      />
      <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col items-center gap-8 py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1
            className="text-3xl md:text-4xl font-bold"
            style={{ textShadow: 'var(--glow-primary)' }}
          >
            The Shop
          </h1>
          <p className="text-secondary text-lg max-w-md">
            Shelves are being stocked. Your credits are safe.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {PREVIEW_ITEMS.map((item) => (
            <div
              key={item.name}
              className="card-static p-6 flex flex-col items-center gap-3 text-center"
              style={{ opacity: 0.7 }}
            >
              <span className="text-4xl">{item.icon}</span>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-secondary text-sm">{item.desc}</p>
              <span className="badge">Coming Soon</span>
            </div>
          ))}
        </div>

        <p className="text-muted text-sm text-center">
          Earn credits by trading Wojaks. Spend them here when the shop opens.
        </p>
      </div>
    </PageTransition>
  );
};

export default Shop;
