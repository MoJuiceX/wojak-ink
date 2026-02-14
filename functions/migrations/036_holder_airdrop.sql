-- Holder Airdrop: 2026-02-14 snapshot
-- Formula: freeMints = floor(1 + ln(held / 5))
-- 1 free mint = 10000 stored credit units (100 display credits)
-- Total: 112 wallets, 226 free mints, 2,260,000 stored units
--
-- Placeholder values for trade-specific NOT NULL columns:
--   nft_id = 'holder_airdrop'
--   event_id = 'airdrop_<wallet_suffix>' (unique per wallet)
--   price_xch = 0
--   floor_at_time = 0
--   whale_multiplier = 10000 (1.0x)
--   event_timestamp = snapshot date

-- ── Tier 4: 4 Free Mints (7 wallets, 28 mints) ──

INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, metadata, event_timestamp)
VALUES
('xch1st3p4m2vluaa6we9anvqcjc0d23gn4v59cfuezh6td7wtxqeq60sp6uuz5', 'holder_airdrop', 'airdrop_sp6uuz5', 0, 0, 40000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":179,"freeMints":4,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1446hepskdwgn2nfunq0qhwweyjvwfn4kfcll6pznjkkfdptvrasqaxkxz5', 'holder_airdrop', 'airdrop_axkxz5', 0, 0, 40000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":150,"freeMints":4,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1y4kmruz7ccnt3vcz3he8vuknps8gfaavnytkg247y8sz0md0kgqsr9cl65', 'holder_airdrop', 'airdrop_r9cl65', 0, 0, 40000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":134,"freeMints":4,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1e874e7x4tzddgnnysunpew34u63kafppg5x2q6x02sda2sr4s39qw2ayk4', 'holder_airdrop', 'airdrop_w2ayk4', 0, 0, 40000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":123,"freeMints":4,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1mstz8e4m6wmqhc4cy23dpghpcejzkkcqrs5gxs3937379ac0zluqtsquvx', 'holder_airdrop', 'airdrop_tsquvx', 0, 0, 40000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":118,"freeMints":4,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1dxyvm8mecn8nkp92ehgsc4wzltnfpvjq8safpdc596hy3msaq95qnskfn9', 'holder_airdrop', 'airdrop_nskfn9', 0, 0, 40000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":115,"freeMints":4,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch10pnjp0vptdqh038wzsl4j98qankvk537wf679ndw85vq474mrl4qz5lcg7', 'holder_airdrop', 'airdrop_z5lcg7', 0, 0, 40000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":110,"freeMints":4,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z');

-- ── Tier 3: 3 Free Mints (28 wallets, 84 mints) ──

INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, metadata, event_timestamp)
VALUES
('xch1fgl5vwmqjusc0nz2clmpc7utkzms7hkgfqq0d8ea3ludj7n2zstqc3e3wp', 'holder_airdrop', 'airdrop_c3e3wp', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":99,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1wrqvr06d0lew6l6nd9w29l6jgsxqm3tfmqedkp0z3nnnv0yzg2jq7emgyh', 'holder_airdrop', 'airdrop_7emgyh', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":98,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1u7jecspyllxzsz4srfvf0pzv489vr3n3tnd3kx2da3avftaq854s4ndhny', 'holder_airdrop', 'airdrop_4ndhny', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":95,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1d8tlv9cza5wgth5458sq9k9q9qqvsv8x0argj8qsyjfqej8w52xq4zv48g', 'holder_airdrop', 'airdrop_4zv48g', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":93,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch10na8nqys9afs0fl74vvd6xl3akgu77p8mvjsp2ywy7rhq2s0jqys3nf7dl', 'holder_airdrop', 'airdrop_3nf7dl', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":93,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch10amws6gyfq4h3cfku328vkfqheg83czpyzk6amsnmaq3qe2s2nhqew99rw', 'holder_airdrop', 'airdrop_ew99rw', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":91,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch16jxqcr50qlqwd9jycv6xdrlq79px2lcujjf2a2w5vv3n7ssh60zs0gqtwk', 'holder_airdrop', 'airdrop_0gqtwk', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":86,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1xqf62gflla6kszmc0z2z7r57knlqu4z285qcq3kemux6u7ud68ksc65kan', 'holder_airdrop', 'airdrop_c65kan', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":83,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch164rups9jzp50xhjrcxh07p03ncmn7m3xxcz0eryhgqt7ppz0lucs2nj07c', 'holder_airdrop', 'airdrop_2nj07c', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":83,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1ac0y2dwcyfjkfmnug8tldqls4gjkkm36zps8ercwte4g85dmf4pqhc8rkv', 'holder_airdrop', 'airdrop_hc8rkv', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":77,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch15sz0ppzzl3reknj2r2czd7hxhrylhtz70l60fkgel4cfjr98e92suzsy77', 'holder_airdrop', 'airdrop_uzsy77', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":74,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1jcljlfkmjl457kr0sn9yykyjn8nx06rth0nkrjcp78zgqn29wqassmg3y5', 'holder_airdrop', 'airdrop_smg3y5', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":71,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1sx092svrs7gq4lnwmk9w6ztq7ar6c4lnay3m2ah0ephyq5ldmu4sfa7ag9', 'holder_airdrop', 'airdrop_fa7ag9', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":69,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch17dg3nc2ekmvcpt6vjy5tgzsr9japvys3cmp5c6heqrrl2a3tjyaq93tpf4', 'holder_airdrop', 'airdrop_93tpf4', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":68,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1phd4n75gmnytpslv8fw50wz37x39krzcclucnzc956qeae90h0cqlx6yqf', 'holder_airdrop', 'airdrop_lx6yqf', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":60,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1sml9tay0s7r27v27p9f5xvm456ghymtuy278eygpc997u3f9qj4qf99vy0', 'holder_airdrop', 'airdrop_f99vy0', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":59,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1j9v5fkset70s0jphykuvjaz0ptq6n8g736qr3gacrnlnqdzl7hpq3qgnpj', 'holder_airdrop', 'airdrop_3qgnpj', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":56,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1u8ktc79nprm5vyx4082790lzvwj6u7lfr0vmqesfn643q73awqvstu6avt', 'holder_airdrop', 'airdrop_tu6avt', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":51,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1jsjtltg5hv0nwm9qusuqe5jumtlkrxwh03srg62gm8z7r9pwfrlqwnqd73', 'holder_airdrop', 'airdrop_wnqd73', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":47,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1hx3zjz9hzrxzrwjgtdg850358ylvaysmsx3yfpp33s9ex6l7qngqnwc90x', 'holder_airdrop', 'airdrop_nwc90x', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":47,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1tfk0sedl9keh3z393tr5s4p3cwejra4pyvyzr930re29w9c5emdqwp6g2p', 'holder_airdrop', 'airdrop_wp6g2p', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":46,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch10qeuwmlk8d2r2nrpu0mj2zwy0xp5rrvumkzqgxqtu7qmfe5sapysxap5xd', 'holder_airdrop', 'airdrop_xap5xd', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":46,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1puma3rsdmfveymykc27u73s5cy6skd9442tsqzhquswhkzy8mdpsaqsgdx', 'holder_airdrop', 'airdrop_aqsgdx', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":43,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1c33yhxfwp8yhgyknurlw32fytm2juxv7uxhqs2wfkcfuak3e08cq84k5yn', 'holder_airdrop', 'airdrop_84k5yn', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":42,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1jfqa4kg0k4q3ug8l3da3utg3qs0yx5ym8829pmuwu9a72ugkk2dshdxnv6', 'holder_airdrop', 'airdrop_shdxnv6', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":40,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1y8zm6zqnx99vu89c8eyltjfkchd35ltm3m7wnf0rg334w3mqh8nspa9afy', 'holder_airdrop', 'airdrop_pa9afy', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":39,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch16eh5qkc9zddftxk2l49hn3c6c2vxaswzq94wqr8cq8qdhdkjm05s0e5xu2', 'holder_airdrop', 'airdrop_0e5xu2', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":39,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1c35tmmj365v5mn9ew0eane3syug6jy7wa70e7prdrwg0sf4e3yjsx5rjw2', 'holder_airdrop', 'airdrop_x5rjw2', 0, 0, 30000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":37,"freeMints":3,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z');

-- ── Tier 2: 2 Free Mints (37 wallets, 74 mints) ──

INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, metadata, event_timestamp)
VALUES
('xch1lue0uj7t2kzxw09lwc3h6rjp5kzpav6ufvzkd3qv5u3y47qgee8sjemkrh', 'holder_airdrop', 'airdrop_jemkrh', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":36,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1yr7nwj7uepk4y027nun9j3hdtq3el6ds6kuc70uaelsr3hf8ak0qaeqx0u', 'holder_airdrop', 'airdrop_aeqx0u', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":33,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1w9uwe4wjj4hs7nf0np6m6zx69302vdckz22vqvn6yxl0ghgzd0ush3hqnf', 'holder_airdrop', 'airdrop_h3hqnf', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":31,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1guva7a8cs32dffzpuu06mr2z3y9crnffjgm7nnupjp6wv6u2ns9seezk9p', 'holder_airdrop', 'airdrop_eezk9p', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":30,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1sngzz0zf7w9ju2p3yptu3yjqttlx68yacwrgvzsq20547rgrzk8qj2ya0s', 'holder_airdrop', 'airdrop_j2ya0s', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":30,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch14p29zv9kq0v3y7ag5dxvdgtf9ts3kd2mvxcpknz9qw3pp5zpygzsxllahd', 'holder_airdrop', 'airdrop_xllahd', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":29,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1mph52j9hxzy88uxm70k0gy7k2qt229rzw8s6cgljdcpsh75evn4s7az08n', 'holder_airdrop', 'airdrop_7az08n', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":29,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1mh3jqarnx9smucdqpx9e35k89m76p68aczwfk83kxln7wcm2g75smfys8z', 'holder_airdrop', 'airdrop_mfys8z', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":29,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch140w3cv9d94acwfa9l6fmnv02dst5jygnag5wmrfcppyed2a6fr4svjnzm6', 'holder_airdrop', 'airdrop_vjnzm6', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":28,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1mjv6f449g6nva5r4fnu3tac26fwupp4vlfcun6p04q4ezgd60qmqwv827d', 'holder_airdrop', 'airdrop_wv827d', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":28,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1akkn6xszzywkq0856j5fekuydmzvtlx2vdnud2086tyav6lvztcq64upk8', 'holder_airdrop', 'airdrop_64upk8', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":28,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1762vrzahyufgk7jakw4h4mwxewu8e4yfd3qu6csv553sefh2g72smvnex9', 'holder_airdrop', 'airdrop_mvnex9', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":27,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch14ar2w3m79y3say8g9qx7ey58jwzsx85fatr4xwvc5ycrt5faa6vqlg6gt0', 'holder_airdrop', 'airdrop_lg6gt0', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":25,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch19pz3t9hxkfd2psqlqpmdwptr6t5xcmldu5zj2ujnpmfwzvajx08s4dcxtg', 'holder_airdrop', 'airdrop_4dcxtg', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":24,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1ervk7gyldseqx077rl63642cflvnphejxx5p3ffataf5swfrrlesj34hf0', 'holder_airdrop', 'airdrop_j34hf0', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":21,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1qywa997vwzrq52ckr0q3njgvmre8pyfcejw4ks348ycv8tdyed7sp8wxg9', 'holder_airdrop', 'airdrop_p8wxg9', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":20,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1dy7qau6w6zcwrxnyav6yl7da80y3xdccjem4axk834ce7ptp5lkqm8c96h', 'holder_airdrop', 'airdrop_m8c96h', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":20,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1qlraankt4la96k36jk5sqp5f8hj4qvxvxmpd6rs5l7s5gwtrdl9qn3rqzp', 'holder_airdrop', 'airdrop_n3rqzp', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":19,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1wfyaywvcczdrws8hjkyfd3kzt2x0778x57q2jp6fmftseae9physefs3zz', 'holder_airdrop', 'airdrop_efs3zz', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":19,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1s4rx33rfpd4wkr625tlzdhqx3lyzy2xc30aq2k2r90pel5emwvhqt0jnn3', 'holder_airdrop', 'airdrop_t0jnn3', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":19,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch14dkv9z7ngzhqwgeq7lhyhh3w9nyfwlqf7w8rdrc7amk7m0dahutsf5fhqv', 'holder_airdrop', 'airdrop_f5fhqv', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":19,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1ngyawmag9ltw9hsma33tyyyswyey3ymwhjs2dd4tql8jf2az8jusuffrqp', 'holder_airdrop', 'airdrop_uffrqp', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":18,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1kwfq35wzw7ynp36rltq54q7pewuy633hhk39wn4qfausmmfnga7s7dwkqz', 'holder_airdrop', 'airdrop_7dwkqz', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":18,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch16c0zxd0xg6fpg2pxpyl7hmkefg5s7m4esejwde20uyvfjqhh5lqqlnnnjy', 'holder_airdrop', 'airdrop_lnnnjy', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":18,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1egtrd68avxeqg8uca2vpps3dwxqsc6yk5t00ylwukjd5w8yz4h3qcmgdsf', 'holder_airdrop', 'airdrop_cmgdsf', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":17,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1dvmjnfrkzallj2wyp457jyzkz7ejd77wp27svft09t5yaaenxmzsr9u900', 'holder_airdrop', 'airdrop_r9u900', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":16,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1d5krtz08a3v8ncgrh4s4cs04guty5smvuenarfzk76hsphqlvm6qr0t75x', 'holder_airdrop', 'airdrop_r0t75x', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":16,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1d4x42k48emch0hqn4fgnnt65k3ezdd0zkpce9h3tntak4uuqawuqdwlq8a', 'holder_airdrop', 'airdrop_dwlq8a', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":16,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch144yzmngytg0q5rvqdrcn53us8x65msdc9hqnk76y2dl4xu9c7l4qqkcd2l', 'holder_airdrop', 'airdrop_qkcd2l', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":16,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1a77ywcqfhez6ekxtvvrpvgpppg5640rvayx88ctajmescfkal2wqzxjh4n', 'holder_airdrop', 'airdrop_zxjh4n', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":16,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1pvgj4y39tns2em3djy0904fqtse9yjth0fcxm06ysh3gwcgdwths4jxhnx', 'holder_airdrop', 'airdrop_4jxhnx', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":15,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch120z33aw40rknsfw6zeax2czcnynft0z60jgem43u96uvunpzt8ws8wja7r', 'holder_airdrop', 'airdrop_8wja7r', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":15,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1p8uzeqql0gtfyqspqwg8t7kxm9gfrh7xyymgdqfxdkgvywvy0rrqd90ad3', 'holder_airdrop', 'airdrop_d90ad3', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":14,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1fxpn59al2pvxng44waxefz8v4ak6m5jltk5jt7lj7t326n4ys69s6efhsq', 'holder_airdrop', 'airdrop_6efhsq', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":14,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch103rjfvn43dqt0ywvh96ka4w9myxunpdky5cgm3xnedk0ztxr9gdqjxy8q9', 'holder_airdrop', 'airdrop_jxy8q9', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":14,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1hr306t3qp55yu7y0mqymp87wsalz8pey0w2ynnjw9k8qxaq4qrqqj4h7lx', 'holder_airdrop', 'airdrop_j4h7lx', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":14,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1usprslnc0qgtq877a0yght3klxhuka08auma62sz6xu6y068qqyquvzj4g', 'holder_airdrop', 'airdrop_uvzj4g', 0, 0, 20000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":14,"freeMints":2,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z');

-- ── Tier 1: 1 Free Mint (40 wallets, 40 mints) ──

INSERT INTO credit_events (wallet_address, nft_id, event_id, price_xch, floor_at_time, credits_earned, whale_multiplier, source, event_type, metadata, event_timestamp)
VALUES
('xch1m29v8w85jn2zflz0ax0ksgmp9g80pzzx3y2spw5z7hergvjldqkqzlcnez', 'holder_airdrop', 'airdrop_zlcnez', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":13,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1ajm3nhqgpl0yp4lrfaspwjyn387wu5aqnmpvw039ak89avnc6chs3e4e43', 'holder_airdrop', 'airdrop_3e4e43', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":13,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1lxee628lq4ttw4uhq8gugwl46snadcndrte23skmamgcxehn32xqhwp333', 'holder_airdrop', 'airdrop_hwp333', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":13,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1lnqdcd0n5layv0rjyfy9rw6v9vrm2hxx7hcv8ypwl8ct6ptwtdqqkdxexr', 'holder_airdrop', 'airdrop_kdxexr', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":13,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1p9424uqjvpjrzr82cp4lv2tqx4sa82rkvlj2y2f28qf27k8qsdxs0hhn48', 'holder_airdrop', 'airdrop_0hhn48', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":12,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch18h6e3weqyh5rgv8h2fa3q7sa9swg54clsz33p4z5lzvt5syav0vqn2l79t', 'holder_airdrop', 'airdrop_n2l79t', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":12,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1gy007zjjg7hucarg2wa5luj782p4qf2seh6q95e6pecgqd6gaqmsaxsxe4', 'holder_airdrop', 'airdrop_axsxe4', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":12,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch14umqnyaa480kj50kwj43cnnh8ek63ynx05a2p7tgwwefs72c5x2s6eq769', 'holder_airdrop', 'airdrop_6eq769', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":12,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1s5lv5sylcpx096wkcwrcjj8farcza3pxwhw645k3v0sgd3p7qh6qqztafk', 'holder_airdrop', 'airdrop_qztafk', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":11,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1js0zgw5fj9qxh2c0a0xsxgq2vvzpx7qcw2mdcmkmcmhhe586hldssgka43', 'holder_airdrop', 'airdrop_sgka43', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":11,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch17ax67ff77dghzendscvzwhhrnf8hyw73auejdysem84gvq92mlqsxdkxsa', 'holder_airdrop', 'airdrop_xdkxsa', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":11,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1qch92n8gc8j3hd4s2ygy82cczdcqhv8r5et6tmg8avfy2hrenm2sjr5atl', 'holder_airdrop', 'airdrop_jr5atl', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":10,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch12yjqh9r76tn8h5ssns0g0r9pa2hwjeg2qyj6uwzfheew2rctek2qgup0d2', 'holder_airdrop', 'airdrop_gup0d2', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":10,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1c5xvser5q0q3y9ukz22uu9vuxnn3hj2wnx5xcl4lkm09j7y68ghspedeav', 'holder_airdrop', 'airdrop_pedeav', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":10,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1pph2hjvs0jnshv87jlwyy4560hq5qu4lt5r6wlf73fwfmkum76ysttc39m', 'holder_airdrop', 'airdrop_ttc39m', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":9,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1y9jt7ufv04zhddd0xje6wmnfh3hu9esenn5kld6uy0kkj2d3catslxzh53', 'holder_airdrop', 'airdrop_lxzh53', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":9,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1mhs4ewtrc42jang0lxr42v2a984r6xyvyvxqmtrqqzsp2ua44egs5acn4k', 'holder_airdrop', 'airdrop_5acn4k', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":9,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1ajv48f4pwf62rk2awdfkdv9symnyw8gnqkywt9lju75gl2pep0gq5v8dwa', 'holder_airdrop', 'airdrop_5v8dwa', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":9,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch17n8d2y7pmruh96dk7n8xpnl3y7f9tdc2eulnefcvuwqlp28a389qwx6ent', 'holder_airdrop', 'airdrop_wx6ent', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":9,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch199tzs926hedee9djdvwdk4m42jtw9whp4s4utgxnxfne2sra3fss5a8jlg', 'holder_airdrop', 'airdrop_5a8jlg', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1xzf3ehqn4ut4e7ck23kn25flqvgafg0aeyq8ltzdfe7f34p6fwjqsh8vd5', 'holder_airdrop', 'airdrop_sh8vd5', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1f3e2qdcmacnt7wt3y5lngt0wy9u47phn6tpyrkk9ugfy977w7sjsg4d667', 'holder_airdrop', 'airdrop_g4d667', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1d3l80s4lcsempxr97sx2ms5gtk36amjhu4uadjm4s9zyvluvde2srddt09', 'holder_airdrop', 'airdrop_rddt09', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1dhmngq9ezg08zyz0ce074neeqgv5ypcq62gmauwyf62fxw95srjqqsa4u5', 'holder_airdrop', 'airdrop_qsa4u5', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1n5d83dzen0yt6ex09wjfvr9drje2srzgevyw7cjka6wtclptrunsumeuvu', 'holder_airdrop', 'airdrop_umeuvu', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1k9kqy5fg3h5pmvq8aacw70mnrfrjma7fgqshnn4dfc2xht3076lqf7wrew', 'holder_airdrop', 'airdrop_f7wrew', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1k8ul9z4076wlhhca5udvrhfyyxqtawtwg3jw6faxddsmdqhffgws20s79s', 'holder_airdrop', 'airdrop_20s79s', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1kd2axshpqlvp4zjk923lc6tthanxzxmrw7ln3nh363236zdauyvq4fyppp', 'holder_airdrop', 'airdrop_4fyppp', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1u7lm6x3zh4tstqzx6sjfg238c9s7wxgz24y8wfyr5jpzdgxm89xs4kzrxr', 'holder_airdrop', 'airdrop_4kzrxr', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch17nxw5z344p4lysnrn4x2w69hq32j594qy9acxd7ru0s3y86rxpws7ytchf', 'holder_airdrop', 'airdrop_7ytchf', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":8,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1zfd4jlgjzhl5lqnxm66m445fz3ptv3zuyeu088uk0kargf8fkqjsf6xf99', 'holder_airdrop', 'airdrop_f6xf99', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":7,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch18tcyy0knvfcgg5dld7gt2zev3qvu0dz5vplhq9gnhwvz9fxyl53qnyppxk', 'holder_airdrop', 'airdrop_nyppxk', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":7,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1g3yspnuvxhltg2rljp3d8dv0466u4cyjsgzgrpd8llywm87fzekqxzhpax', 'holder_airdrop', 'airdrop_xzhpax', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":7,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch12pfws6enm2jeqjt03pspqg6sjh50g86hl9xm24dx4cwwm2l88nmqrrznj7', 'holder_airdrop', 'airdrop_rrznj7', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":7,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch149wyd37hans7vzxwhqk4ua5plhguuxxu62sqcl69hsa7tnm0z7ssk092ge', 'holder_airdrop', 'airdrop_k092ge', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":7,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1aw73nsjjylrmxgnx40lzletctfpcjtzmdzfsuyl2j9kyfmh5256qztxdaz', 'holder_airdrop', 'airdrop_ztxdaz', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":7,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1my060wunm32s8e0h03h7fhuq0va39xgc3zzq6wcrzmcv35aaphus82trr6', 'holder_airdrop', 'airdrop_82trr6', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":6,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1ryvpmcsan00qz2dzj6g4zv83u088h4r685fg0y4x2l4h5mqavu9qgndj2z', 'holder_airdrop', 'airdrop_gndj2z', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":5,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1yj3nfvccdfxgt9rw8ejrqv04npgj6gcz37hleaqfpeq0kp94fpeq0tuypk', 'holder_airdrop', 'airdrop_0tuypk', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":5,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z'),
('xch1cwrye8cgxtwgxut2g4yelu4ju5c7tvjtjt8zdkge4dx884sh6qaqr72mxa', 'holder_airdrop', 'airdrop_r72mxa', 0, 0, 10000, 10000, 'holder_snapshot', 'holder_airdrop', '{"held":5,"freeMints":1,"snapshot":"2026-02-14"}', '2026-02-14T00:00:00Z');
