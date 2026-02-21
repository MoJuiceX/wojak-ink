# Tracing Where Paid Mint XCH Goes (Block Explorer)

When a user pays for a Your Wojak mint, they accept an offer; the XCH goes to the address MintGarden put on the "request" side of that offer. You can see that address on-chain.

## 1. Get a paid-mint NFT launcher ID from your DB

Run this against your production D1 database (replace `wojak-users` with your DB name if different):

```bash
npx wrangler d1 execute wojak-users --remote --command \
  "SELECT mint_number, mintgarden_launcher_id, wallet_address, total_price_xch, minted_at
   FROM phase2_mints
   WHERE mint_type = 'paid' AND status = 'minted' AND mintgarden_launcher_id IS NOT NULL
   ORDER BY minted_at DESC LIMIT 5;"
```

Pick one `mintgarden_launcher_id` (e.g. `nft1...`) from the results.

## 2. Look up the NFT on a block explorer

- **Spacescan:** Open [spacescan.io](https://spacescan.io), use the search bar and paste the **launcher ID** (e.g. `nft1...`). Open the NFT result.
- **MintGarden:** You can also open `https://mintgarden.io/nfts/<LAUNCHER_ID>` — the NFT page may link to the creation transaction.

## 3. Find the creation / “mint” transaction

On the NFT page, look for:

- **Transaction history** or **Activity**
- The **first** transaction (or the one that created the NFT / transferred it to the minter)

That transaction is when the user accepted the offer: they sent XCH and received the NFT.

## 4. See where the XCH went

In that transaction:

- Find the **XCH (or mojos) transfer** that the buyer sent.
- The **recipient address** of that XCH is where MintGarden sends your primary-sale proceeds for your profile (your DID).

That address is the wallet that has been receiving the XCH from your 240 paid mints. You can then:

- Search that address on the explorer to see balance and history.
- Compare it to any wallet you expect (e.g. the one you used when setting up MintGarden / the API).
- Ask MintGarden support how that address is chosen and how to withdraw or change it.

## Quick reference

| Step | What to do |
|------|------------|
| 1 | Run the SQL above to get a `mintgarden_launcher_id` for a paid mint. |
| 2 | Search that launcher ID on [spacescan.io](https://spacescan.io). |
| 3 | Open the NFT → find the creation/first transaction. |
| 4 | In that tx, find the XCH transfer → recipient address = where your mint XCH goes. |
