import fs from 'fs'

const groups = ['HOA', 'PP', 'LOVE', 'HONK', 'CASTER', 'CHIA']
const baseOffer = 'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0nrg43vnvhm76y428c2htvpkuue3xarmhmg5xffrn6lm42mxa6xdpwljqy5w9rel6mnt6ar4795fef8mldlf6tnh82x0wdwwnjflv46fl2yll667alum8dd7vmeksccrmy3t7mk3cm79ulta878pfatkf5ltnyullpn5c5tdvm2avvulh4ats7d94vd0k0n7awm67p6ufn9smvpuca60tjwm8nxcwzgwd4dlcfdm4nnw8vpq60kxtp7zrrte3h8ffrxwjn7fl8ffnypr8fgsxj76pl5428c8awuhnawrhn2fkm5uaynma637wyl6y0xxy3fda6nn7kxjkdlhlq5hzw9c7ja2g7mjmlnscmqa4zmfcv6qw7muhd7jn2f0wlnjkthumm4nrc8aslf22ncqsjp7jhmj3htfekj7vaj4whr49faa6y5te07fd89aaqa396s4wfsnrw3lgvdsfvp68uehcem8cqylusgzmau7re07y89kc8yvwe7ldm0qff47w92uk5kdjexap7ph7k8xfxr7p7fz7nlcr3yvj2fg9c4t047jf395e2jdfn854tjvf2526nf0x4yzmnwfxv5janfvf99zkt9w9vhnzvw2f2425jw2x49js2xf93x5kdkdxu623n6v40yzjv75eq45u27nedyju2f0egky7n2t68xvhnk06g6n2ven6q4u7jsz8v5kfqa6fh5hk4vtwd4kdawghlgen4ah3pqh03xskm4g8thkdmm8hnewpz0ll7dl9qfwex3zm6ajptel8qxwa89qrks4g2ejku4jzdflxzkn759dy5jqjc27wqvxng95hsryderq9tuafv8th4d76r7u77krhtndmnulklhpuxakctvlkdjdcnuwelew3ttpquajjc5z2wlxmua8wcl4588a5njn9fvm4rl0x3g0pz4gl7ak3mdl7ez7ravpkqv0a4l9aknma6x34n0hkcl8u6rd2hf774n9wd443wnas89hm6uneu6j7hh2c3t2arwfmjnwrxwnhxua8w37q8hl50elw3zxj07kvm4qu404r4d04ttjlc5spmgn70lqcnu6w5lezm04kfptlehru9z5dsmkn846ntzpjtqucd43drkwsxxuaqvdlgumqll5ael26zp7w9x047en59g4hd5zxdzt47h2re07c6n3ac8dzk4hh93sf40937gxrknqqe2crwf0q8r4vx4k80fvqph0tpc64lr3r8jtxs70ahv2ltzckalchsxd3wk8w49xtrnteaahtxwrxu64te0elmaagnaa7pdy0pxshmev8v86k9gm2q5hlluh3q7z5n00vaw3s9l7mskas7ak3mhww4ue0rdahdr0t409qdx0mhrrsemls25dhv6vfhthjmnaymw09uzrppg6srdxmh3yzm9426hu2dc960eqcm2p46ps60vprh79llhlst86kne7l0cqweu8lk34xjr8fdmn497hqdtyl4h7v0evq622h6lpmp3jgqzsmh7qefsc8lutpqx5eshjpscr837sy4yqm3qcqaxn402lnm0ckwh5e8vnaeq367r2h6uunk99683hm8m3djeem3y4zmnz6g9747awhhnh6h8jjkvjlm3nm7hky92snfl2fw8hst6dhgheagda3ea4fkgc79ttlzc5r7p2cxfcp37m3jkn4melhr6w40jq6wfwm7sel5f4wjqrsp8aupytsc4cdej'
const altOffer = 'offer1qqz83wcsltt6wcmqvpsxygqq6tmp20fkzcmnnwmf7mff2a7a0shrpjyfl0ytl6e7hwt0887qncnmeemqatsymvx33fkmgcsm4hvyv2ak6x9xmdrzlvl5q9gm53c97c97aaeu9w7kgm3k6uer5vnwg85fv4wp7cp7wakkphxwczhd6ddjtf24qewtxs8puwhkv7ak7uzfvtup8zu8rjhmv8kcd5rue94ny5znv0mf6c2gv4s46zax6a9wrzxyzvstm343y95gk9v4nud7m8qd8uxdtx7wnu49anrvd7njl9wlm07dk7rzcqp2n9f8kvrng4eueap854ka09z00rwmsheadhc7hlk9wvfhc86a0muj5n080u97h4u8p3zzspzehy47f5k8d2534sumk7mdacnwvqk9mxaxkuu73gyyulga0kmx0qawu0wwrzcv9ac6vwzxdhwhrkwvjyl79rwp8vj5n6jmnenj2fadg8h9mxfhvvpsxrrd5lvls8d9sxwwd0xuqpn0tr7x0nukdup2ln896m4n9meamuh0v38u53rve9t90wtrzptkm602sat9dksf97u58tncxmld56d3cntnxszxkmvq5n407zmk84eyc74lx7kt7u60j5ylhrr9s2737f8xa470cganltw2925l70ajhlahxx7ddk8sskssrtr6uh2fjfw07em7ah009sa2kuhdksd7rz6hxwwxv2n7nmmyeqhn3wzutchl44zkymjtgz9xml306zv02g4t3wqa8vy5fhtkhwjsc0jk46e433zlclnpt0memngfnkct78dgetl07qkpyalry6c4tl9uel2l8r4mnxk8n2jvctpenvnk6pl7cjk9eha3w0gj5uysdca2zdlfuk2wu0f889nt29ttrrwusvm6uc0r60e6608u309jdnccggxdgv0eu3y2ua6sthmuktxg86lj8802llck3268cckemuhwkwytgl22pu7arjgehdvd2un7m7w6npcfch08484wn496h05jhx5mdewh49rqkyvqp0kf04kq8hvfh8'

let csv = 'nftId,offerFile\n'

// Generate entries for all 120 NFTs (6 groups × 20 NFTs each)
groups.forEach(group => {
  for (let i = 1; i <= 20; i++) {
    const nftId = `${group}-${String(i).padStart(3, '0')}`
    // Alternate between two offer strings for variety
    const offer = i % 2 === 0 ? baseOffer : altOffer
    csv += `${nftId},${offer}\n`
  }
})

// Add additional entries to reach 300+
for (let i = 121; i <= 300; i++) {
  const group = groups[Math.floor((i - 121) / 30)]
  const num = ((i - 121) % 30) + 1
  const nftId = `${group}-EXTRA-${String(num).padStart(3, '0')}`
  const offer = i % 2 === 0 ? baseOffer : altOffer
  csv += `${nftId},${offer}\n`
}

fs.writeFileSync('src/data/offerFiles.csv', csv)
console.log(`CSV file created with ${csv.split('\n').length - 1} entries (excluding header)`)

