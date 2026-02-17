// Loading skeleton for the vote card — same dimensions as SwipeCard.

export function VoteCardSkeleton() {
  return (
    <div className="vote-card-skeleton">
      <div className="vote-card-skeleton-image" />
      <div className="vote-card-skeleton-info">
        <div className="vote-card-skeleton-bar" style={{ width: '60%' }} />
        <div className="vote-card-skeleton-bar" style={{ width: '20%' }} />
      </div>
    </div>
  );
}
