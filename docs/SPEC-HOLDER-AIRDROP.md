# SPEC: Holder Airdrop — Free Mint Credits for Wojak Farmers Plot Holders

> **For Claude CLI:** Read this entire spec before implementing. This is a one-time credit airdrop for OG collection holders.

---

## Context

Two separate incentive systems exist for the Your Wojak generator:

1. **Trading Credits (existing)** — 60 wallets earn ongoing credits from secondary market purchases of Wojak Farmers Plot NFTs. Scales with XCH spent. This is the primary incentive.

2. **Holder Airdrop (this spec)** — A one-time snapshot bonus for wallets currently holding 5+ Wojak Farmers Plot NFTs. Rewards loyalty and activates holders who may not be trading on secondary markets.

### Why Both?

- Trading credits reward **buying behavior** (market activity)
- Holder airdrop rewards **holding behavior** (loyalty)
- Some wallets are on both lists — that's fine, each system rewards different behavior
- The airdrop uses held count (not adjusted for secondary purchases) to keep implementation simple

### Budget

| System | Free Mints | % of 4,200 Supply |
|--------|:----------:|:------------------:|
| Trading credits | ~186 | 4.4% |
| Holder airdrop | 226 | 5.4% |
| **Combined** | **~412** | **~9.8%** |

Hard cap: combined free mints must not exceed 10% of supply (420 mints).

---

## Snapshot Data

- **Source:** MintGarden holder export for collection `col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah`
- **Snapshot date:** 2026-02-14
- **Total holders:** 334 wallets
- **Total NFTs held:** 4,208
- **Qualifying wallets (5+ held):** 112

---

## Formula

```
freeMints = floor(1 + ln(held / 5))
```

Where:
- `held` = number of Wojak Farmers Plot NFTs currently held by the wallet
- `ln` = natural logarithm
- `floor` = round down to nearest integer
- Minimum `held` to qualify: 5

### Natural Breakpoints

| Free Mints | Held Range | Threshold | Wallets |
|:----------:|:----------:|:---------:|:-------:|
| 1 | 5–13 | 5 | 40 |
| 2 | 14–36 | 14 (5 × e¹) | 37 |
| 3 | 37–100 | 37 (5 × e²) | 28 |
| 4 | 101+ | 101 (5 × e³) | 7 |

### Why This Formula

- **Logarithmic** — going from 5 → 179 held (36×) only gives 4× reward. Big holders get a nod, not a windfall.
- **No arbitrary tiers** — breakpoints emerge naturally from the math.
- **Self-capping** — reaching 5 mints would require 273+ NFTs (impossible in a 4,200 collection where max holder has 179).
- **Budget-safe** — 226 total mints, comfortably under the 234-mint budget (420 cap minus 186 trading credits).

---

## Complete Airdrop List (112 Wallets)

### Tier 4: 4 Free Mints (7 wallets, 28 mints)

| Wallet | Held |
|--------|:----:|
| `xch1st3p4m2vluaa6we9anvqcjc0d23gn4v59cfuezh6td7wtxqeq60sp6uuz5` | 179 |
| `xch1446hepskdwgn2nfunq0qhwweyjvwfn4kfcll6pznjkkfdptvrasqaxkxz5` | 150 |
| `xch1y4kmruz7ccnt3vcz3he8vuknps8gfaavnytkg247y8sz0md0kgqsr9cl65` | 134 |
| `xch1e874e7x4tzddgnnysunpew34u63kafppg5x2q6x02sda2sr4s39qw2ayk4` | 123 |
| `xch1mstz8e4m6wmqhc4cy23dpghpcejzkkcqrs5gxs3937379ac0zluqtsquvx` | 118 |
| `xch1dxyvm8mecn8nkp92ehgsc4wzltnfpvjq8safpdc596hy3msaq95qnskfn9` | 115 |
| `xch10pnjp0vptdqh038wzsl4j98qankvk537wf679ndw85vq474mrl4qz5lcg7` | 110 |

### Tier 3: 3 Free Mints (28 wallets, 84 mints)

| Wallet | Held |
|--------|:----:|
| `xch1fgl5vwmqjusc0nz2clmpc7utkzms7hkgfqq0d8ea3ludj7n2zstqc3e3wp` | 99 |
| `xch1wrqvr06d0lew6l6nd9w29l6jgsxqm3tfmqedkp0z3nnnv0yzg2jq7emgyh` | 98 |
| `xch1u7jecspyllxzsz4srfvf0pzv489vr3n3tnd3kx2da3avftaq854s4ndhny` | 95 |
| `xch1d8tlv9cza5wgth5458sq9k9q9qqvsv8x0argj8qsyjfqej8w52xq4zv48g` | 93 |
| `xch10na8nqys9afs0fl74vvd6xl3akgu77p8mvjsp2ywy7rhq2s0jqys3nf7dl` | 93 |
| `xch10amws6gyfq4h3cfku328vkfqheg83czpyzk6amsnmaq3qe2s2nhqew99rw` | 91 |
| `xch16jxqcr50qlqwd9jycv6xdrlq79px2lcujjf2a2w5vv3n7ssh60zs0gqtwk` | 86 |
| `xch1xqf62gflla6kszmc0z2z7r57knlqu4z285qcq3kemux6u7ud68ksc65kan` | 83 |
| `xch164rups9jzp50xhjrcxh07p03ncmn7m3xxcz0eryhgqt7ppz0lucs2nj07c` | 83 |
| `xch1ac0y2dwcyfjkfmnug8tldqls4gjkkm36zps8ercwte4g85dmf4pqhc8rkv` | 77 |
| `xch15sz0ppzzl3reknj2r2czd7hxhrylhtz70l60fkgel4cfjr98e92suzsy77` | 74 |
| `xch1jcljlfkmjl457kr0sn9yykyjn8nx06rth0nkrjcp78zgqn29wqassmg3y5` | 71 |
| `xch1sx092svrs7gq4lnwmk9w6ztq7ar6c4lnay3m2ah0ephyq5ldmu4sfa7ag9` | 69 |
| `xch17dg3nc2ekmvcpt6vjy5tgzsr9japvys3cmp5c6heqrrl2a3tjyaq93tpf4` | 68 |
| `xch1phd4n75gmnytpslv8fw50wz37x39krzcclucnzc956qeae90h0cqlx6yqf` | 60 |
| `xch1sml9tay0s7r27v27p9f5xvm456ghymtuy278eygpc997u3f9qj4qf99vy0` | 59 |
| `xch1j9v5fkset70s0jphykuvjaz0ptq6n8g736qr3gacrnlnqdzl7hpq3qgnpj` | 56 |
| `xch1u8ktc79nprm5vyx4082790lzvwj6u7lfr0vmqesfn643q73awqvstu6avt` | 51 |
| `xch1jsjtltg5hv0nwm9qusuqe5jumtlkrxwh03srg62gm8z7r9pwfrlqwnqd73` | 47 |
| `xch1hx3zjz9hzrxzrwjgtdg850358ylvaysmsx3yfpp33s9ex6l7qngqnwc90x` | 47 |
| `xch1tfk0sedl9keh3z393tr5s4p3cwejra4pyvyzr930re29w9c5emdqwp6g2p` | 46 |
| `xch10qeuwmlk8d2r2nrpu0mj2zwy0xp5rrvumkzqgxqtu7qmfe5sapysxap5xd` | 46 |
| `xch1puma3rsdmfveymykc27u73s5cy6skd9442tsqzhquswhkzy8mdpsaqsgdx` | 43 |
| `xch1c33yhxfwp8yhgyknurlw32fytm2juxv7uxhqs2wfkcfuak3e08cq84k5yn` | 42 |
| `xch1jfqa4kg0k4q3ug8l3da3utg3qs0yx5ym8829pmuwu9a72ugkk2dshdxnv6` | 40 |
| `xch1y8zm6zqnx99vu89c8eyltjfkchd35ltm3m7wnf0rg334w3mqh8nspa9afy` | 39 |
| `xch16eh5qkc9zddftxk2l49hn3c6c2vxaswzq94wqr8cq8qdhdkjm05s0e5xu2` | 39 |
| `xch1c35tmmj365v5mn9ew0eane3syug6jy7wa70e7prdrwg0sf4e3yjsx5rjw2` | 37 |

### Tier 2: 2 Free Mints (37 wallets, 74 mints)

| Wallet | Held |
|--------|:----:|
| `xch1lue0uj7t2kzxw09lwc3h6rjp5kzpav6ufvzkd3qv5u3y47qgee8sjemkrh` | 36 |
| `xch1yr7nwj7uepk4y027nun9j3hdtq3el6ds6kuc70uaelsr3hf8ak0qaeqx0u` | 33 |
| `xch1w9uwe4wjj4hs7nf0np6m6zx69302vdckz22vqvn6yxl0ghgzd0ush3hqnf` | 31 |
| `xch1guva7a8cs32dffzpuu06mr2z3y9crnffjgm7nnupjp6wv6u2ns9seezk9p` | 30 |
| `xch1sngzz0zf7w9ju2p3yptu3yjqttlx68yacwrgvzsq20547rgrzk8qj2ya0s` | 30 |
| `xch14p29zv9kq0v3y7ag5dxvdgtf9ts3kd2mvxcpknz9qw3pp5zpygzsxllahd` | 29 |
| `xch1mph52j9hxzy88uxm70k0gy7k2qt229rzw8s6cgljdcpsh75evn4s7az08n` | 29 |
| `xch1mh3jqarnx9smucdqpx9e35k89m76p68aczwfk83kxln7wcm2g75smfys8z` | 29 |
| `xch140w3cv9d94acwfa9l6fmnv02dst5jygnag5wmrfcppyed2a6fr4svjnzm6` | 28 |
| `xch1mjv6f449g6nva5r4fnu3tac26fwupp4vlfcun6p04q4ezgd60qmqwv827d` | 28 |
| `xch1akkn6xszzywkq0856j5fekuydmzvtlx2vdnud2086tyav6lvztcq64upk8` | 28 |
| `xch1762vrzahyufgk7jakw4h4mwxewu8e4yfd3qu6csv553sefh2g72smvnex9` | 27 |
| `xch14ar2w3m79y3say8g9qx7ey58jwzsx85fatr4xwvc5ycrt5faa6vqlg6gt0` | 25 |
| `xch19pz3t9hxkfd2psqlqpmdwptr6t5xcmldu5zj2ujnpmfwzvajx08s4dcxtg` | 24 |
| `xch1ervk7gyldseqx077rl63642cflvnphejxx5p3ffataf5swfrrlesj34hf0` | 21 |
| `xch1qywa997vwzrq52ckr0q3njgvmre8pyfcejw4ks348ycv8tdyed7sp8wxg9` | 20 |
| `xch1dy7qau6w6zcwrxnyav6yl7da80y3xdccjem4axk834ce7ptp5lkqm8c96h` | 20 |
| `xch1qlraankt4la96k36jk5sqp5f8hj4qvxvxmpd6rs5l7s5gwtrdl9qn3rqzp` | 19 |
| `xch1wfyaywvcczdrws8hjkyfd3kzt2x0778x57q2jp6fmftseae9physefs3zz` | 19 |
| `xch1s4rx33rfpd4wkr625tlzdhqx3lyzy2xc30aq2k2r90pel5emwvhqt0jnn3` | 19 |
| `xch14dkv9z7ngzhqwgeq7lhyhh3w9nyfwlqf7w8rdrc7amk7m0dahutsf5fhqv` | 19 |
| `xch1ngyawmag9ltw9hsma33tyyyswyey3ymwhjs2dd4tql8jf2az8jusuffrqp` | 18 |
| `xch1kwfq35wzw7ynp36rltq54q7pewuy633hhk39wn4qfausmmfnga7s7dwkqz` | 18 |
| `xch16c0zxd0xg6fpg2pxpyl7hmkefg5s7m4esejwde20uyvfjqhh5lqqlnnnjy` | 18 |
| `xch1egtrd68avxeqg8uca2vpps3dwxqsc6yk5t00ylwukjd5w8yz4h3qcmgdsf` | 17 |
| `xch1dvmjnfrkzallj2wyp457jyzkz7ejd77wp27svft09t5yaaenxmzsr9u900` | 16 |
| `xch1d5krtz08a3v8ncgrh4s4cs04guty5smvuenarfzk76hsphqlvm6qr0t75x` | 16 |
| `xch1d4x42k48emch0hqn4fgnnt65k3ezdd0zkpce9h3tntak4uuqawuqdwlq8a` | 16 |
| `xch144yzmngytg0q5rvqdrcn53us8x65msdc9hqnk76y2dl4xu9c7l4qqkcd2l` | 16 |
| `xch1a77ywcqfhez6ekxtvvrpvgpppg5640rvayx88ctajmescfkal2wqzxjh4n` | 16 |
| `xch1pvgj4y39tns2em3djy0904fqtse9yjth0fcxm06ysh3gwcgdwths4jxhnx` | 15 |
| `xch120z33aw40rknsfw6zeax2czcnynft0z60jgem43u96uvunpzt8ws8wja7r` | 15 |
| `xch1p8uzeqql0gtfyqspqwg8t7kxm9gfrh7xyymgdqfxdkgvywvy0rrqd90ad3` | 14 |
| `xch1fxpn59al2pvxng44waxefz8v4ak6m5jltk5jt7lj7t326n4ys69s6efhsq` | 14 |
| `xch103rjfvn43dqt0ywvh96ka4w9myxunpdky5cgm3xnedk0ztxr9gdqjxy8q9` | 14 |
| `xch1hr306t3qp55yu7y0mqymp87wsalz8pey0w2ynnjw9k8qxaq4qrqqj4h7lx` | 14 |
| `xch1usprslnc0qgtq877a0yght3klxhuka08auma62sz6xu6y068qqyquvzj4g` | 14 |

### Tier 1: 1 Free Mint (40 wallets, 40 mints)

| Wallet | Held |
|--------|:----:|
| `xch1m29v8w85jn2zflz0ax0ksgmp9g80pzzx3y2spw5z7hergvjldqkqzlcnez` | 13 |
| `xch1ajm3nhqgpl0yp4lrfaspwjyn387wu5aqnmpvw039ak89avnc6chs3e4e43` | 13 |
| `xch1lxee628lq4ttw4uhq8gugwl46snadcndrte23skmamgcxehn32xqhwp333` | 13 |
| `xch1lnqdcd0n5layv0rjyfy9rw6v9vrm2hxx7hcv8ypwl8ct6ptwtdqqkdxexr` | 13 |
| `xch1p9424uqjvpjrzr82cp4lv2tqx4sa82rkvlj2y2f28qf27k8qsdxs0hhn48` | 12 |
| `xch18h6e3weqyh5rgv8h2fa3q7sa9swg54clsz33p4z5lzvt5syav0vqn2l79t` | 12 |
| `xch1gy007zjjg7hucarg2wa5luj782p4qf2seh6q95e6pecgqd6gaqmsaxsxe4` | 12 |
| `xch14umqnyaa480kj50kwj43cnnh8ek63ynx05a2p7tgwwefs72c5x2s6eq769` | 12 |
| `xch1s5lv5sylcpx096wkcwrcjj8farcza3pxwhw645k3v0sgd3p7qh6qqztafk` | 11 |
| `xch1js0zgw5fj9qxh2c0a0xsxgq2vvzpx7qcw2mdcmkmcmhhe586hldssgka43` | 11 |
| `xch17ax67ff77dghzendscvzwhhrnf8hyw73auejdysem84gvq92mlqsxdkxsa` | 11 |
| `xch1qch92n8gc8j3hd4s2ygy82cczdcqhv8r5et6tmg8avfy2hrenm2sjr5atl` | 10 |
| `xch12yjqh9r76tn8h5ssns0g0r9pa2hwjeg2qyj6uwzfheew2rctek2qgup0d2` | 10 |
| `xch1c5xvser5q0q3y9ukz22uu9vuxnn3hj2wnx5xcl4lkm09j7y68ghspedeav` | 10 |
| `xch1pph2hjvs0jnshv87jlwyy4560hq5qu4lt5r6wlf73fwfmkum76ysttc39m` | 9 |
| `xch1y9jt7ufv04zhddd0xje6wmnfh3hu9esenn5kld6uy0kkj2d3catslxzh53` | 9 |
| `xch1mhs4ewtrc42jang0lxr42v2a984r6xyvyvxqmtrqqzsp2ua44egs5acn4k` | 9 |
| `xch1ajv48f4pwf62rk2awdfkdv9symnyw8gnqkywt9lju75gl2pep0gq5v8dwa` | 9 |
| `xch17n8d2y7pmruh96dk7n8xpnl3y7f9tdc2eulnefcvuwqlp28a389qwx6ent` | 9 |
| `xch199tzs926hedee9djdvwdk4m42jtw9whp4s4utgxnxfne2sra3fss5a8jlg` | 8 |
| `xch1xzf3ehqn4ut4e7ck23kn25flqvgafg0aeyq8ltzdfe7f34p6fwjqsh8vd5` | 8 |
| `xch1f3e2qdcmacnt7wt3y5lngt0wy9u47phn6tpyrkk9ugfy977w7sjsg4d667` | 8 |
| `xch1d3l80s4lcsempxr97sx2ms5gtk36amjhu4uadjm4s9zyvluvde2srddt09` | 8 |
| `xch1dhmngq9ezg08zyz0ce074neeqgv5ypcq62gmauwyf62fxw95srjqqsa4u5` | 8 |
| `xch1n5d83dzen0yt6ex09wjfvr9drje2srzgevyw7cjka6wtclptrunsumeuvu` | 8 |
| `xch1k9kqy5fg3h5pmvq8aacw70mnrfrjma7fgqshnn4dfc2xht3076lqf7wrew` | 8 |
| `xch1k8ul9z4076wlhhca5udvrhfyyxqtawtwg3jw6faxddsmdqhffgws20s79s` | 8 |
| `xch1kd2axshpqlvp4zjk923lc6tthanxzxmrw7ln3nh363236zdauyvq4fyppp` | 8 |
| `xch1u7lm6x3zh4tstqzx6sjfg238c9s7wxgz24y8wfyr5jpzdgxm89xs4kzrxr` | 8 |
| `xch17nxw5z344p4lysnrn4x2w69hq32j594qy9acxd7ru0s3y86rxpws7ytchf` | 8 |
| `xch1zfd4jlgjzhl5lqnxm66m445fz3ptv3zuyeu088uk0kargf8fkqjsf6xf99` | 7 |
| `xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk` | 7 |
| `xch1g3yspnuvxhltg2rljp3d8dv0466u4cyjsgzgrpd8llywm87fzekqxzhpax` | 7 |
| `xch12pfws6enm2jeqjt03pspqg6sjh50g86hl9xm24dx4cwwm2l88nmqrrznj7` | 7 |
| `xch149wyd37hans7vzxwhqk4ua5plhguuxxu62sqcl69hsa7tnm0z7ssk092ge` | 7 |
| `xch1aw73nsjjylrmxgnx40lzletctfpcjtzmdzfsuyl2j9kyfmh5256qztxdaz` | 7 |
| `xch1my060wunm32s8e0h03h7fhuq0va39xgc3zzq6wcrzmcv35aaphus82trr6` | 6 |
| `xch1ryvpmcsan00qz2dzj6g4zv83u088h4r685fg0y4x2l4h5mqavu9qgndj2z` | 5 |
| `xch1yj3nfvccdfxgt9rw8ejrqv04npgj6gcz37hleaqfpeq0kp94fpeq0tuypk` | 5 |
| `xch1cwrye8cgxtwgxut2g4yelu4ju5c7tvjtjt8zdkge4dx884sh6qaqr72mxa` | 5 |

---

## Totals

| Tier | Wallets | Mints Each | Total Mints |
|:----:|:-------:|:----------:|:-----------:|
| 4 | 7 | 4 | 28 |
| 3 | 28 | 3 | 84 |
| 2 | 37 | 2 | 74 |
| 1 | 40 | 1 | 40 |
| **All** | **112** | | **226** |

---

## Implementation

### Option A: Database Migrations (Recommended)

Two migrations are needed:

**Migration 1:** `functions/migrations/035_holder_airdrop_schema.sql`

Adds the `event_type` and `metadata` columns to `credit_events` if they don't exist:

```sql
-- Add event_type to distinguish trading credits from airdrop credits
ALTER TABLE credit_events ADD COLUMN event_type TEXT DEFAULT 'trade';
ALTER TABLE credit_events ADD COLUMN metadata TEXT;
```

**Migration 2:** `functions/migrations/036_holder_airdrop.sql`

Inserts credit events for all 112 wallets. Each free mint = 100 credits (10000 stored units).

**Important:** The `credit_events` table has NOT NULL columns (`nft_id`, `event_id`, `price_xch`, `floor_at_time`, `whale_multiplier`, `source`, `event_timestamp`) that must be provided. Use placeholder values for airdrop-specific rows:

```sql
-- Holder Airdrop: 2026-02-14 snapshot
-- Formula: floor(1 + ln(held / 5)) free mints per wallet
-- 1 free mint = 10000 stored credit units (100 display credits)

INSERT INTO credit_events (
  event_id, nft_id, wallet_address, price_xch, floor_at_time,
  credits_earned, whale_multiplier, source, event_timestamp,
  event_type, metadata
)
VALUES
  ('airdrop_001', 'holder_airdrop', 'xch1st3p4m2vluaa6we9anvqcjc0d23gn4v59cfuezh6td7wtxqeq60sp6uuz5',
   0, 0, 40000, 10000, 'holder_airdrop', datetime('now'),
   'holder_airdrop', '{"held":179,"freeMints":4,"snapshot":"2026-02-14"}'),
  -- ... all 112 wallets ...
  ('airdrop_112', 'holder_airdrop', 'xch1cwrye8cgxtwgxut2g4yelu4ju5c7tvjtjt8zdkge4dx884sh6qaqr72mxa',
   0, 0, 10000, 10000, 'holder_airdrop', datetime('now'),
   'holder_airdrop', '{"held":5,"freeMints":1,"snapshot":"2026-02-14"}');
```

### Schema Notes

The `credit_events` table (from migration 030) has these required columns:
- `event_id TEXT UNIQUE NOT NULL` — use `'airdrop_001'` through `'airdrop_112'`
- `nft_id TEXT NOT NULL` — use `'holder_airdrop'` as placeholder
- `price_xch INTEGER NOT NULL` — use `0` (no XCH spent)
- `floor_at_time INTEGER NOT NULL` — use `0`
- `whale_multiplier INTEGER NOT NULL` — use `10000` (1.0x)
- `source TEXT NOT NULL` — use `'holder_airdrop'`
- `event_timestamp TEXT NOT NULL` — use `datetime('now')`
- `event_type TEXT` — use `'holder_airdrop'` (added by migration 035)
- `metadata TEXT` — JSON with held count, freeMints, snapshot date (added by migration 035)

---

## Leaderboard Impact

After the airdrop, the leaderboard should show both credit sources. Options:

1. **Combined view** — Trading credits + airdrop credits shown as one balance (simplest)
2. **Separate columns** — "Earned (Trading)" and "Earned (Holder Bonus)" shown separately
3. **Label in history** — When viewing credit history, airdrop events show "Holder Airdrop" instead of an NFT purchase

Recommendation: **Option 1** (combined) for the balance, with **Option 3** (labeled history) for transparency.

---

## Verification

After applying the airdrop:

1. Total credits inserted = 226 × 10000 = **2,260,000 stored units**
2. Check: `SELECT COUNT(*) FROM credit_events WHERE event_type = 'holder_airdrop'` should return **112**
3. Check: `SELECT SUM(credits_earned) FROM credit_events WHERE event_type = 'holder_airdrop'` should return **2,260,000**
4. Spot-check: Top holder wallet should show +400 credits (4 free mints) from airdrop
5. Spot-check: Smallest holder should show +100 credits (1 free mint) from airdrop
6. Leaderboard should update to reflect new balances

---

## Communication

When announcing the airdrop (Discord, social media), use BRAND-VOICE.md tone:

**Suggested announcement:**
> Holding Wojak Farmers Plot? You just earned free mints for Your Wojak.
>
> 112 wallets holding 5+ WFP NFTs are getting free mint credits — check your balance in the leaderboard. The more you hold, the more you got.
>
> This is a one-time thank you for the OG holders. Already earning credits from trading? Those stack on top.

---

## Appendix: Raw Data

Snapshot file: `/Users/abit_hex/Downloads/col10hfq4hml2z0z0wutu3a9hvt60qy9fcq4k4dznsfncey4lu6kpt3su7u9ah_2026-02-14_11_28_36.txt`

Formula verification:
```
floor(1 + ln(5/5))   = floor(1 + 0)      = 1  ✓
floor(1 + ln(14/5))  = floor(1 + 1.030)  = 2  ✓
floor(1 + ln(37/5))  = floor(1 + 2.002)  = 3  ✓
floor(1 + ln(101/5)) = floor(1 + 3.006)  = 4  ✓
floor(1 + ln(179/5)) = floor(1 + 3.577)  = 4  ✓
```
