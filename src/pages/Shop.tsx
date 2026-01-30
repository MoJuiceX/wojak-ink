/**
 * Shop Page
 *
 * Browse and purchase items with oranges or gems.
 */

import { PageTransition } from '@/components/layout/PageTransition';
import { Shop as ShopComponent } from '@/components/Shop';
import { InfoButton } from '@/components/common/InfoButton';

const Shop = () => {
  return (
    <PageTransition>
      <div className="min-h-full">
        <ShopComponent />
        <p
          className="text-center text-sm py-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          More items arriving soon. Stay tuned.
        </p>
      </div>
      <InfoButton page="shop" />
    </PageTransition>
  );
};

export default Shop;
