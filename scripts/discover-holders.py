#!/usr/bin/env python3
"""
Discover all Farmers Plot holders from MintGarden and insert them into game_players.
Uses MintGarden API to paginate all Phase 1 NFTs and extract unique owner DIDs.
Outputs SQL INSERT statements for wrangler d1 execute.
"""
import urllib.request
import json
import time
import sys

PHASE1_COLLECTION = 'col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah'
PAGE_SIZE = 100
RATE_LIMIT_MS = 0.5  # 500ms between pages

def fetch_page(cursor=None):
    url = f'https://api.mintgarden.io/collections/{PHASE1_COLLECTION}/nfts?size={PAGE_SIZE}'
    if cursor:
        url += f'&cursor={urllib.parse.quote(cursor)}'
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def main():
    holder_dids = {}  # did -> {name, wallet}
    cursor = None
    page = 0
    
    while page < 50:
        data = fetch_page(cursor)
        items = data.get('items', [])
        if not items:
            break
        
        for item in items:
            owner_did = item.get('owner_encoded_id')
            if owner_did and owner_did.startswith('did:chia:'):
                if owner_did not in holder_dids:
                    holder_dids[owner_did] = {
                        'name': (item.get('owner_name') or '').strip(),
                        'wallet': item.get('owner_address_encoded_id', ''),
                    }
        
        page += 1
        next_cursor = data.get('next')
        print(f'  Page {page}: {len(items)} NFTs, {len(holder_dids)} unique DIDs so far', file=sys.stderr)
        
        if not next_cursor or len(items) < PAGE_SIZE:
            break
        cursor = next_cursor
        time.sleep(RATE_LIMIT_MS)
    
    print(f'\nTotal: {len(holder_dids)} unique DID holders found across {page} pages\n', file=sys.stderr)
    
    # Output SQL for wrangler d1 execute
    today = time.strftime('%Y-%m-%d')
    for did, info in holder_dids.items():
        wallet = (info['wallet'] or '').replace("'", "''")
        name = info['name'].replace("'", "''")
        
        # game_players insert
        print(f"INSERT OR IGNORE INTO game_players (did_id, wallet_address, phase1_verified, votes_today_reset) VALUES ('{did}', '{wallet}', 1, '{today}');")
        
        # did_profiles upsert (only if name is valid)
        if name and len(name) >= 2:
            print(f"INSERT INTO did_profiles (did_id, display_name, name_source, created_at, updated_at) VALUES ('{did}', '{name}', 'chain', datetime('now'), datetime('now')) ON CONFLICT(did_id) DO UPDATE SET display_name = CASE WHEN name_source = 'random' OR name_source IS NULL THEN '{name}' ELSE display_name END, name_source = CASE WHEN name_source = 'random' OR name_source IS NULL THEN 'chain' ELSE name_source END, updated_at = datetime('now');")

if __name__ == '__main__':
    import urllib.parse
    main()
