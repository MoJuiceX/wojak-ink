/**
 * Clean badge NFT data so no Head or Clothes trait is shared between badges.
 *
 * Algorithm:
 * 1. Rebuild original badgeNfts from nft_badge_mapping.json (source of truth).
 * 2. Assign each Head/Clothes trait to the badge with the highest count.
 * 3. If any badge ends up too small, reassign traits from well-stocked badges.
 * 4. An NFT stays in badge B only if BOTH its Head and Clothes traits belong to B.
 */
const fs = require("fs");
const path = require("path");

const metadata = require("../public/assets/nft-data/metadata.json");
const badgeMapping = require("../public/assets/Badges/nft_badge_mapping.json");

const OUTPUT_PATH = path.join(__dirname, "../src/games/NFT2048/badgeNfts.json");
const MIN_BADGE_SIZE = 5;

// The 11 badges used in the game, in progression order
const GAME_BADGES = [
  "Phunky", "High Council", "Bepe Army", "Honk Gang", "Pirate",
  "Super Saiyan", "Ronin", "Neckbeard", "Royal Club", "Hellspawn", "Namekian"
];

// --- Helpers ---

const nftByEdition = {};
for (const nft of metadata) nftByEdition[nft.edition] = nft;

function getTrait(nftId, traitType) {
  const nft = nftByEdition[nftId];
  if (!nft) return null;
  const attr = nft.attributes.find((a) => a.trait_type === traitType);
  return attr ? attr.value : null;
}

// --- Step 1: Rebuild original badgeNfts from nft_badge_mapping.json ---

const originalBadgeNfts = {};
for (const badge of GAME_BADGES) originalBadgeNfts[badge] = [];

const nftBadgesMap = badgeMapping.nft_badges || badgeMapping;
for (const [editionStr, entry] of Object.entries(nftBadgesMap)) {
  const nftId = parseInt(editionStr, 10);
  const nftBadges = entry.badges || [];
  for (const b of nftBadges) {
    const badgeName = typeof b === "string" ? b : b.badge || b.name;
    if (GAME_BADGES.includes(badgeName)) {
      originalBadgeNfts[badgeName].push(nftId);
    }
  }
}

console.log("=== ORIGINAL BADGE SIZES (from nft_badge_mapping.json) ===");
for (const badge of GAME_BADGES) {
  console.log("  " + badge + ": " + originalBadgeNfts[badge].length);
}
console.log("");

// --- Step 2: Build trait usage maps ---

function buildTraitUsage(traitType) {
  const usage = {};
  for (const badge of GAME_BADGES) {
    for (const nftId of originalBadgeNfts[badge]) {
      const val = getTrait(nftId, traitType);
      if (!val) continue;
      if (!usage[val]) usage[val] = {};
      if (!usage[val][badge]) usage[val][badge] = 0;
      usage[val][badge]++;
    }
  }
  return usage;
}

const headUsage = buildTraitUsage("Head");
const clothesUsage = buildTraitUsage("Clothes");

// --- Step 3: Assign each trait to the badge with the highest count ---

const headOwner = {};
const clothesOwner = {};

function assignTraits(usage, ownerMap) {
  for (const [traitVal, badgeCounts] of Object.entries(usage)) {
    const sorted = Object.entries(badgeCounts).sort((a, b) => b[1] - a[1]);
    ownerMap[traitVal] = sorted[0][0];
  }
}

assignTraits(headUsage, headOwner);
assignTraits(clothesUsage, clothesOwner);

// --- Step 4: Compute survivors ---

function computeSurvivors() {
  const result = {};
  for (const badge of GAME_BADGES) {
    result[badge] = originalBadgeNfts[badge].filter((nftId) => {
      const head = getTrait(nftId, "Head");
      const clothes = getTrait(nftId, "Clothes");
      const headOk = !head || headOwner[head] === badge;
      const clothesOk = !clothes || clothesOwner[clothes] === badge;
      return headOk && clothesOk;
    });
  }
  return result;
}

// --- Step 5: Fix badges below minimum by reassigning traits ---

function fixSmallBadges() {
  let iterations = 0;

  while (iterations++ < 100) {
    const survivors = computeSurvivors();
    const needHelp = GAME_BADGES.filter((b) => survivors[b].length < MIN_BADGE_SIZE);
    if (needHelp.length === 0) break;

    let madeProgress = false;

    for (const emptyBadge of needHelp) {
      // Collect all traits this badge's NFTs have, scored by recovery potential
      const options = [];
      const seen = new Set();

      for (const nftId of originalBadgeNfts[emptyBadge]) {
        for (const traitType of ["Clothes", "Head"]) {
          const val = getTrait(nftId, traitType);
          if (!val) continue;
          const ownerMap = traitType === "Head" ? headOwner : clothesOwner;
          if (ownerMap[val] === emptyBadge) continue;
          const key = traitType + ":" + val;
          if (seen.has(key)) continue;
          seen.add(key);

          const currentOwner = ownerMap[val];
          const usage = traitType === "Head" ? headUsage : clothesUsage;
          const countInEmpty = (usage[val] || {})[emptyBadge] || 0;
          const ownerCount = survivors[currentOwner].length;

          options.push({
            traitType,
            traitVal: val,
            currentOwner,
            countInEmpty,
            ownerSurvivors: ownerCount,
            // Prefer: high count in empty badge, owner has plenty left
            score: countInEmpty * 100 + ownerCount,
          });
        }
      }

      // Sort: best recovery options first
      options.sort((a, b) => b.score - a.score);

      for (const opt of options) {
        const ownerMap = opt.traitType === "Head" ? headOwner : clothesOwner;
        const prevOwner = ownerMap[opt.traitVal];

        // Tentatively reassign
        ownerMap[opt.traitVal] = emptyBadge;

        const newSurvivors = computeSurvivors();
        const newEmptyCount = newSurvivors[emptyBadge].length;
        const newOwnerCount = newSurvivors[prevOwner].length;

        if (newOwnerCount < MIN_BADGE_SIZE) {
          // Revert — would make the donor too small
          ownerMap[opt.traitVal] = prevOwner;
          continue;
        }

        console.log(
          "  Reassigned " + opt.traitType + " \"" + opt.traitVal + "\" from " +
          prevOwner + " to " + emptyBadge +
          " (" + emptyBadge + ": " + newEmptyCount + ", " + prevOwner + ": " + newOwnerCount + ")"
        );
        madeProgress = true;

        if (newEmptyCount >= MIN_BADGE_SIZE) break;
      }
    }

    if (!madeProgress) {
      console.log("  WARNING: Could not improve further.");
      break;
    }
  }
}

console.log("=== FIXING SMALL BADGES ===");
fixSmallBadges();

// --- Step 6: Final computation ---

const finalBadges = computeSurvivors();

// --- Report ---

console.log("");
console.log("=== TRAIT OWNERSHIP ===");

console.log("");
console.log("Head traits:");
const headByBadge = {};
for (const [trait, badge] of Object.entries(headOwner)) {
  if (!headByBadge[badge]) headByBadge[badge] = [];
  headByBadge[badge].push(trait);
}
for (const badge of GAME_BADGES) {
  const traits = headByBadge[badge] || [];
  console.log("  " + badge + " (" + traits.length + "): " + traits.join(", "));
}

console.log("");
console.log("Clothes traits:");
const clothesByBadge = {};
for (const [trait, badge] of Object.entries(clothesOwner)) {
  if (!clothesByBadge[badge]) clothesByBadge[badge] = [];
  clothesByBadge[badge].push(trait);
}
for (const badge of GAME_BADGES) {
  const traits = clothesByBadge[badge] || [];
  console.log("  " + badge + " (" + traits.length + "): " + traits.join(", "));
}

console.log("");
console.log("=== FINAL BADGE SIZES ===");
let totalKept = 0;
for (const badge of GAME_BADGES) {
  const orig = originalBadgeNfts[badge].length;
  const kept = finalBadges[badge].length;
  totalKept += kept;
  const status = kept < MIN_BADGE_SIZE ? " *** LOW ***" : "";
  console.log("  " + badge + ": " + orig + " -> " + kept + " (removed " + (orig - kept) + ")" + status);
}
const totalOrig = GAME_BADGES.reduce((s, b) => s + originalBadgeNfts[b].length, 0);
console.log("");
console.log("Total: " + totalOrig + " -> " + totalKept + " (removed " + (totalOrig - totalKept) + ")");

// --- Verification ---

console.log("");
console.log("=== VERIFICATION ===");
let conflicts = 0;

for (const traitType of ["Head", "Clothes"]) {
  const traitToBadges = {};
  for (const badge of GAME_BADGES) {
    for (const nftId of finalBadges[badge]) {
      const val = getTrait(nftId, traitType);
      if (!val) continue;
      if (!traitToBadges[val]) traitToBadges[val] = new Set();
      traitToBadges[val].add(badge);
    }
  }
  for (const [trait, badgeSet] of Object.entries(traitToBadges)) {
    if (badgeSet.size > 1) {
      console.log("  CONFLICT: " + traitType + " \"" + trait + "\" in: " + [...badgeSet].join(", "));
      conflicts++;
    }
  }
}

if (conflicts === 0) {
  console.log("  ALL CLEAR - No shared Head or Clothes traits between any badges!");
} else {
  console.log("  WARNING: " + conflicts + " conflicts remain");
}

// --- Write ---

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalBadges, null, 2) + "\n");
console.log("");
console.log("Written to " + OUTPUT_PATH);
