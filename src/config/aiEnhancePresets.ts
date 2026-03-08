import type { AICategory, AIStyleFamily, AICategoryPresets } from '@/types/aiEnhance';

// --- Universal Enhance Families (shared across clothes and head) ---

const UNIVERSAL_ENHANCE: AIStyleFamily[] = [
  {
    label: '🐾 Animal Prints',
    options: [
      { label: 'Tiger stripes', prompt: 'Add bold tiger stripe pattern, dark brown and black stripes on orange-tan base, natural animal fur texture' },
      { label: 'Leopard spots', prompt: 'Apply leopard spot pattern with golden tan rosettes and dark brown spots, exotic animal print' },
      { label: 'Zebra stripes', prompt: 'Add black and white zebra stripe pattern, bold contrasting parallel lines, African wildlife print' },
      { label: 'Snake skin', prompt: 'Apply reptile snake skin texture with diamond-shaped scales, iridescent green and brown pattern' },
      { label: 'Crocodile leather', prompt: 'Apply crocodile leather texture with raised rectangular scales, dark green-brown embossed pattern' },
      { label: 'Cow print', prompt: 'Add black and white cow spot pattern, large irregular patches, Holstein dairy cow print' },
    ],
  },
  {
    label: '🔥 Elemental',
    options: [
      { label: 'Flame pattern', prompt: 'Add bold orange and red flame pattern, realistic fire texture with hot orange tips fading to deep red' },
      { label: 'Ice frost', prompt: 'Cover with ice crystals and frost, thin frozen layer, cool blue-white crystalline frozen surface' },
      { label: 'Lightning bolts', prompt: 'Add bright yellow-white lightning bolt streaks crackling across the surface, electric energy effect' },
      { label: 'Lava cracks', prompt: 'Add deep cracks with bright orange-red molten lava glowing through, dark volcanic rock surface with magma veins' },
      { label: 'Smoke & ash', prompt: 'Cover with grey smoke wisps and dark ash residue, smoldering charred look, burnt smoky effect' },
      { label: 'Sandstorm grit', prompt: 'Cover with fine desert sand particles and dust, sun-baked sandy texture, wind-worn erosion effect' },
    ],
  },
  {
    label: '✨ Precious Metals',
    options: [
      { label: 'Gold plating', prompt: 'Cover with polished gold plating, reflective metallic gold surface with subtle shine highlights, luxury gold finish' },
      { label: 'Chrome mirror', prompt: 'Transform into polished chrome with mirror-like reflective surface, sleek liquid metal silver finish' },
      { label: 'Diamond encrusted', prompt: 'Cover with small embedded diamonds and gemstones, sparkling crystal studs, encrusted jewelry bling effect' },
      { label: 'Copper patina', prompt: 'Apply aged copper finish with green patina oxidation, weathered bronze-green metallic surface' },
      { label: 'Obsidian black glass', prompt: 'Transform into smooth glossy obsidian volcanic glass, deep black reflective surface with sharp edges' },
      { label: 'Brushed titanium', prompt: 'Apply brushed titanium matte grey metallic finish, fine directional scratches on metal, industrial premium look' },
    ],
  },
  {
    label: '⚔️ Battle Worn',
    options: [
      { label: 'Dented & scratched', prompt: 'Add battle damage with visible dents, deep scratches, and worn surface, weathered from combat' },
      { label: 'Rusty corroded', prompt: 'Transform with orange-brown rust spots, patchy oxidation, weathered corroded metal texture' },
      { label: 'Arrow pierced', prompt: 'Add an arrow stuck through the surface, wooden shaft and feathered fletching, battle damage' },
      { label: 'Blood splattered', prompt: 'Add dark red blood splatter marks and drips across the surface, battle-stained and gory' },
      { label: 'Wrapped in bandages', prompt: 'Wrap with torn white cloth bandages and medical tape, combat field repair look' },
      { label: 'Cracked with light leaking', prompt: 'Add deep cracks across the surface with bright golden-white light glowing through from inside' },
    ],
  },
  {
    label: '🎨 Art & Paint',
    options: [
      { label: 'Graffiti spray', prompt: 'Cover with colorful graffiti spray paint, bold dripping letters and tags, urban street art style' },
      { label: 'Splatter paint', prompt: 'Cover with Jackson Pollock style paint splatters, random drips and splashes in multiple bright colors' },
      { label: 'Watercolor wash', prompt: 'Apply soft watercolor paint wash effect, translucent bleeding colors, artistic wet paint look' },
      { label: 'Neon paint', prompt: 'Cover with bright fluorescent neon paint in pink, green, and yellow, glowing blacklight reactive colors' },
      { label: 'Comic halftone dots', prompt: 'Apply comic book halftone dot pattern, Ben-Day dots in pop art style, Roy Lichtenstein effect' },
      { label: 'Stained glass mosaic', prompt: 'Transform into stained glass mosaic pattern with black lead lines between colorful translucent glass segments' },
    ],
  },
  {
    label: '👾 Digital & Glitch',
    options: [
      { label: '8-bit pixelated', prompt: 'Transform into chunky 8-bit pixel art style, blocky retro video game graphics, low-resolution mosaic' },
      { label: 'Glitch artifact', prompt: 'Add digital glitch effects with horizontal scan lines, data corruption artifacts, distorted pixel blocks' },
      { label: 'VHS distortion', prompt: 'Apply VHS tape distortion with tracking lines, color bleeding, analog video noise and static' },
      { label: 'Circuit board', prompt: 'Transform surface into green circuit board PCB with copper traces, solder points, and microchip components' },
      { label: 'Hologram flicker', prompt: 'Add holographic projection effect with blue transparent overlay, scan lines, and digital flicker' },
      { label: 'RGB chromatic split', prompt: 'Apply RGB color channel split effect, offset red green and blue layers creating triple-vision glitch' },
    ],
  },
  {
    label: '🌿 Nature Overgrowth',
    options: [
      { label: 'Ivy vines', prompt: 'Add green ivy vines and small leaves growing across the surface, nature reclaiming with organic tendrils' },
      { label: 'Moss covered', prompt: 'Cover with soft green moss patches, damp fuzzy lichen growing on the surface, ancient overgrown look' },
      { label: 'Flower blooms', prompt: 'Add colorful flowers blooming from the surface, roses daisies and wildflowers sprouting organically' },
      { label: 'Coral growth', prompt: 'Add underwater coral formations growing on surface, pink and orange brain coral and sea anemones' },
      { label: 'Mushroom sprouts', prompt: 'Add small mushrooms and toadstools sprouting from the surface, fantasy fungal growth, colorful caps' },
      { label: 'Bird nest', prompt: 'Add a small bird nest with twigs and straw nestled on the surface, cozy natural wildlife home' },
    ],
  },
];

// --- Clothes-Only Enhance Families ---

const CLOTHES_ENHANCE: AIStyleFamily[] = [
  {
    label: '💎 Luxury & Bling',
    options: [
      { label: 'Gold embroidery', prompt: 'Add intricate gold thread embroidery with ornate swirl patterns and decorative stitching, metallic gold on fabric' },
      { label: 'Diamond studs', prompt: 'Add sparkling diamond studs scattered across the clothing, small clear crystals catching light, bling effect' },
      { label: 'Velvet texture', prompt: 'Transform the fabric into rich deep velvet with soft plush pile texture, luxurious smooth finish' },
      { label: 'Fur trim', prompt: 'Add soft fur trim along edges and collar, fluffy animal fur border in warm brown, luxury winter look' },
      { label: 'Sequin sparkle', prompt: 'Cover with round sequin discs catching light, thousands of small reflective circles, sparkling disco fabric' },
      { label: 'Silk satin sheen', prompt: 'Transform into smooth silk satin fabric with glossy reflective sheen, elegant draping material' },
    ],
  },
  {
    label: '🎖️ Tactical & Combat',
    options: [
      { label: 'Woodland camo', prompt: 'Apply military camouflage pattern with olive green, dark brown, tan, and black irregular patches, woodland camo' },
      { label: 'Desert camo', prompt: 'Apply desert camouflage pattern with tan, beige, brown, and khaki irregular patches, arid sand camo' },
      { label: 'Tactical vest webbing', prompt: 'Add MOLLE tactical vest webbing straps and pouches over the clothing, military load-bearing gear' },
      { label: 'Ammunition belt wraps', prompt: 'Wrap ammunition belts across the clothing, brass bullet rounds in canvas belt, action hero look' },
      { label: 'Military medal patches', prompt: 'Add military rank patches, merit badges, and medal ribbons pinned to the chest area' },
      { label: 'Dog tag chains', prompt: 'Add metal military dog tags on ball chain necklace hanging over the clothing, soldier identity tags' },
    ],
  },
  {
    label: '🎸 Street & Punk',
    options: [
      { label: 'Punk patches', prompt: 'Add punk rock patches, band logos sewn on fabric, DIY rebellious punk aesthetic' },
      { label: 'Graffiti paint', prompt: 'Spray paint colorful graffiti tags and throw-ups across the fabric, street art style' },
      { label: 'Torn distressed', prompt: 'Add torn rips and distressed holes in the fabric, frayed edges, worn grunge look' },
      { label: 'Safety pins & studs', prompt: 'Add safety pins, metal cone studs, and rivets pierced through the fabric, punk DIY style' },
      { label: 'Studded leather', prompt: 'Transform into black studded leather with rows of metal dome studs, biker punk aesthetic' },
      { label: 'Skateboard graphics', prompt: 'Add bold skateboard deck art graphics, colorful illustrated designs, skate culture street style' },
    ],
  },
  {
    label: '🌈 Patterns',
    options: [
      { label: 'Tie-dye spiral', prompt: 'Transform into vibrant tie-dye with swirling spirals of purple, blue, pink, and yellow, psychedelic pattern' },
      { label: 'Hawaiian floral', prompt: 'Transform into Hawaiian shirt pattern with tropical hibiscus flowers, palm leaves, bright island colors' },
      { label: 'Optical illusion', prompt: 'Apply M.C. Escher style optical illusion geometric pattern, impossible shapes in black and white' },
      { label: 'Mandala geometric', prompt: 'Apply intricate mandala geometric pattern with concentric circles and repeating symmetrical designs' },
      { label: 'Racing stripes', prompt: 'Add bold racing stripes running vertically, white stripes on dark fabric, motorsport style' },
      { label: 'Checkerboard', prompt: 'Apply bold black and white checkerboard pattern, alternating square tiles, ska punk racing flag style' },
    ],
  },
  {
    label: '⚡ Sci-Fi & Tech',
    options: [
      { label: 'Tron circuit lines', prompt: 'Add glowing neon circuit lines tracing across the fabric, bright cyan light strips, futuristic digital grid' },
      { label: 'Holographic shimmer', prompt: 'Apply iridescent holographic finish shifting between rainbow colors, opalescent shimmering surface' },
      { label: 'Carbon fiber', prompt: 'Transform into carbon fiber weave pattern, dark grey interlocking diagonal fibers, lightweight tech material' },
      { label: 'LED strips', prompt: 'Add embedded LED light strips along seams and edges, glowing colored lights, wearable tech fashion' },
      { label: 'Matrix code', prompt: 'Cover with falling green Matrix digital rain code, cascading Japanese characters on dark background' },
      { label: 'Wireframe mesh', prompt: 'Transform into 3D wireframe mesh, geometric polygon outlines in glowing blue on dark, virtual reality look' },
    ],
  },
  {
    label: '⚔️ Medieval & Fantasy',
    options: [
      { label: 'Chainmail armor', prompt: 'Replace with medieval chainmail armor, interlocking metal rings, silver steel links, knight warrior look' },
      { label: 'Plate armor', prompt: 'Transform into polished plate armor segments, heavy steel plates with rivets, full knight armor' },
      { label: 'Dragon scales', prompt: 'Cover with overlapping dragon scales, iridescent green-gold reptilian armor, fantasy creature texture' },
      { label: 'Rune inscriptions', prompt: 'Carve glowing ancient rune symbols and mystical inscriptions into the surface, magical Nordic lettering' },
      { label: 'Royal crest', prompt: 'Add an ornate royal coat of arms crest embroidered on the chest, heraldic shield with lion motif' },
      { label: 'Elven leaf embroidery', prompt: 'Add intricate elvish leaf and vine embroidery in silver thread, delicate nature-inspired fantasy stitching' },
    ],
  },
  {
    label: '🍕 Weird & Fun',
    options: [
      { label: 'Pizza pattern', prompt: 'Cover with pepperoni pizza pattern, melted cheese and tomato sauce, repeating pizza slice print' },
      { label: 'Blood splatter', prompt: 'Add dark red blood splatter and drip stains across the fabric, horror movie gory look' },
      { label: 'Candy sprinkles', prompt: 'Cover with colorful candy sprinkles and jimmies, rainbow sugar confetti on frosting-like surface' },
      { label: 'Bacon weave', prompt: 'Transform into woven bacon strips pattern, crispy cooked bacon lattice weave, meat fabric' },
      { label: 'Duct tape wrapped', prompt: 'Wrap in strips of grey duct tape, overlapping pieces of adhesive tape, makeshift repair look' },
      { label: 'Bubblewrap texture', prompt: 'Transform into clear bubblewrap with visible air bubbles, transparent popping packaging material texture' },
    ],
  },
  {
    label: '⚡ Energy & Power',
    options: [
      { label: 'Energy aura crackling', prompt: 'Add visible crackling energy aura around the clothing, electric blue power field sparking outward' },
      { label: 'Power-up glow', prompt: 'Add intense golden power-up glow radiating from the clothing, super saiyan energy emanation' },
      { label: 'Divine golden light', prompt: 'Add divine golden holy light rays emanating from the clothing, heavenly sacred glow effect' },
      { label: 'Ki blast sparks', prompt: 'Add bright white ki energy sparks and particles swirling around the clothing, anime power effect' },
      { label: 'Magical particles', prompt: 'Add floating magical sparkle particles and fairy dust swirling around the clothing, enchanted shimmer' },
      { label: 'Lightning surge', prompt: 'Add blue-white lightning bolts crackling and surging around the clothing, electrical power overload' },
    ],
  },
  {
    label: '👴 Worn & Aged',
    options: [
      { label: 'Sun-bleached faded', prompt: 'Make colors faded and sun-bleached, washed out from years of sunlight exposure, vintage worn look' },
      { label: 'Moth-eaten holes', prompt: 'Add small moth-eaten holes scattered through the fabric, aged deteriorating cloth, old wardrobe look' },
      { label: 'Blood stained', prompt: 'Add old dried blood stain marks on the fabric, dark brown-red aged bloodstains, battle veteran look' },
      { label: 'Patched & repaired', prompt: 'Add visible fabric patches sewn over holes, mismatched repair patches with visible stitching' },
      { label: 'Dust covered', prompt: 'Cover with fine layer of grey dust and cobwebs, abandoned and neglected, found in an attic look' },
      { label: 'Sweat stained', prompt: 'Add visible sweat stains and salt marks, yellowed discoloration, heavily worn workout look' },
    ],
  },
];

// --- Head-Only Enhance Families ---

const HEAD_ENHANCE: AIStyleFamily[] = [
  {
    label: '⚙️ Steampunk',
    options: [
      { label: 'Brass gears & cogs', prompt: 'Add brass clockwork gears and rotating cogs attached to the surface, Victorian mechanical aesthetic' },
      { label: 'Copper pipe network', prompt: 'Add small copper pipes and tube fittings running across the surface, industrial plumbing steampunk style' },
      { label: 'Steam vents', prompt: 'Add small steam vent openings releasing wisps of white steam, pressure release valves' },
      { label: 'Tesla coil sparks', prompt: 'Add miniature Tesla coil apparatus with visible purple electrical arcs and sparks, mad scientist style' },
      { label: 'Pressure gauge dials', prompt: 'Add round brass pressure gauge dials with needles and numbered faces mounted on the surface' },
      { label: 'Leather & rivet binding', prompt: 'Wrap with brown leather straps held by brass rivets and buckles, steampunk adventurer aesthetic' },
    ],
  },
  {
    label: '🔮 Magical',
    options: [
      { label: 'Glowing runes', prompt: 'Add glowing magical rune symbols carved into the surface, bright blue-white mystical Norse letters' },
      { label: 'Crystal embedded', prompt: 'Embed large colorful crystals and gems growing from the surface, amethyst quartz formations' },
      { label: 'Starfield pattern', prompt: 'Apply deep space starfield pattern across the surface, tiny stars and nebula colors, cosmic night sky' },
      { label: 'Ancient spell pages', prompt: 'Wrap with ancient parchment spell pages covered in mystical handwritten text and arcane diagrams' },
      { label: 'Phoenix feather crown', prompt: 'Add majestic phoenix feathers in orange-red-gold rising from the top, magical firebird plumage' },
      { label: 'Shadow tendrils', prompt: 'Add dark shadow tendrils and black smoke wisps curling around the surface, dark magic aura' },
    ],
  },
  {
    label: '🧢 Patches & Pins',
    options: [
      { label: 'Embroidered logo', prompt: 'Add a colorful embroidered logo patch stitched onto the front, custom embroidery with thick thread' },
      { label: 'Iron-on patches', prompt: 'Add multiple iron-on fabric patches with various designs scattered on the surface, DIY custom look' },
      { label: 'Enamel pin collection', prompt: 'Add small colorful enamel pins stuck into the surface, collection of cute cartoon badge pins' },
      { label: 'Sewn-on badges', prompt: 'Add circular sewn-on merit badges and scout patches in a row, achievement badge collection' },
      { label: 'Screen-printed design', prompt: 'Add bold screen-printed graphic design on the front, single color ink print, skate brand style' },
      { label: 'Bleach-dye splash', prompt: 'Add bleach splash dye effect creating lighter discolored patches, acid wash DIY streetwear look' },
    ],
  },
  {
    label: '🤠 Weathered & Adventure',
    options: [
      { label: 'Sun-bleached & faded', prompt: 'Make colors faded and sun-bleached from years outdoors, washed out from desert sun exposure' },
      { label: 'Rain-soaked wet', prompt: 'Make look freshly rain-soaked, darkened wet fabric with visible water droplets and dripping moisture' },
      { label: 'Dust & sand coated', prompt: 'Cover with fine desert sand and trail dust, dirty and dusty from long wilderness journey' },
      { label: 'Bullet hole through brim', prompt: 'Add a single bullet hole punched clean through with singed edges, close call gunshot damage' },
      { label: 'Feather & bone decoration', prompt: 'Add feathers and small animal bones tied on with leather cord, wilderness survival decoration' },
      { label: 'Sweat-stained band', prompt: 'Add dark sweat stain ring around the band, salt crystallization marks, well-worn working hat' },
    ],
  },
  {
    label: '🍬 Food & Candy',
    options: [
      { label: 'Chocolate coated', prompt: 'Dip in rich dark chocolate coating, smooth melted chocolate shell with drip marks, candy confection' },
      { label: 'Candy cane stripes', prompt: 'Apply red and white candy cane spiral stripe pattern, peppermint Christmas candy look' },
      { label: 'Gummy bear texture', prompt: 'Transform into translucent gummy bear candy material, shiny gel-like jiggly surface, candy colors' },
      { label: 'Donut glaze & sprinkles', prompt: 'Cover with pink donut glaze icing dripping down with colorful rainbow sprinkles on top' },
      { label: 'Caramel dripping', prompt: 'Cover with warm golden caramel sauce dripping and pooling, sticky sweet toffee coating' },
      { label: 'Frosting & fondant', prompt: 'Cover with smooth cake frosting and fondant in pastel colors, birthday cake decoration style' },
    ],
  },
  {
    label: '🧊 Material Swap',
    options: [
      { label: 'Carved wood', prompt: 'Transform into hand-carved wood with visible grain pattern and chisel marks, wooden sculpture' },
      { label: 'Marble stone', prompt: 'Transform into polished marble with white and grey veined stone pattern, classical sculpture material' },
      { label: 'Glass transparent', prompt: 'Transform into clear transparent glass, see-through crystalline material, delicate blown glass' },
      { label: 'Paper origami', prompt: 'Transform into folded paper origami, visible paper creases and geometric folds, Japanese paper art' },
      { label: 'Bone & ivory', prompt: 'Transform into carved bone and ivory material, aged yellowed skeletal surface, tribal artifact' },
      { label: 'Clay ceramic', prompt: 'Transform into fired clay ceramic with visible pottery glazing, handmade terracotta crafted look' },
    ],
  },
];

// --- Create New Families ---

const CLOTHES_CREATE: AIStyleFamily[] = [
  {
    label: '⚔️ Armor & Warriors',
    options: [
      { label: 'Knight plate armor', prompt: 'Full medieval knight plate armor suit with chest plate, pauldrons, and gauntlets, polished steel' },
      { label: 'Samurai yoroi armor', prompt: 'Traditional Japanese samurai yoroi armor with layered lacquered plates and silk cord lacing' },
      { label: 'Gladiator chest plate', prompt: 'Roman gladiator chest plate with leather straps, bronze chest guard, arena fighter gear' },
      { label: 'Viking chain armor', prompt: 'Viking chainmail armor tunic over leather underlayer, Norse warrior battle gear with fur shoulders' },
      { label: 'Spartan battle gear', prompt: 'Spartan warrior crimson cape and bronze chest plate, leather war skirt, 300 battle outfit' },
      { label: 'Dark lord shadow armor', prompt: 'Evil dark lord black spiked plate armor, dark enchanted metal with red glowing runes, villain armor' },
    ],
  },
  {
    label: '👔 Formal & Elegant',
    options: [
      { label: 'Royal tuxedo with tails', prompt: 'Formal black tuxedo with long tails, white dress shirt, black bow tie, elegant evening wear' },
      { label: 'Victorian frock coat', prompt: 'Victorian era long frock coat in dark grey, high collar, ornate buttons, gentleman period clothing' },
      { label: 'White dinner jacket', prompt: 'Classic white dinner jacket with black satin lapels, formal resort evening wear, James Bond style' },
      { label: 'Velvet smoking jacket', prompt: 'Rich burgundy velvet smoking jacket with silk shawl collar, quilted satin lining, luxury lounge wear' },
      { label: 'Military dress uniform', prompt: 'Formal military dress uniform with gold braiding, epaulettes, medal ribbons, and polished buttons' },
      { label: 'Maharaja sherwani', prompt: 'Ornate Indian maharaja sherwani coat in gold brocade, intricate embroidery, royal Indian formal wear' },
    ],
  },
  {
    label: '🧪 Sci-Fi & Future',
    options: [
      { label: 'Space marine power suit', prompt: 'Heavy space marine power armor suit, thick armored plates, glowing power cells, futuristic soldier' },
      { label: 'Cyberpunk neon jacket', prompt: 'Cyberpunk leather jacket with glowing neon trim lines, high collar, tech augmentation ports' },
      { label: 'Holographic bodysuit', prompt: 'Skin-tight holographic bodysuit shifting between rainbow colors, futuristic iridescent material' },
      { label: 'Robot exoskeleton', prompt: 'Mechanical robot exoskeleton frame over the body, hydraulic joints, exposed servos and wiring' },
      { label: 'Alien symbiote suit', prompt: 'Living alien symbiote suit bonded to the body, dark organic material with tendrils, Venom-like' },
      { label: 'Tron light suit', prompt: 'Black bodysuit with bright glowing blue circuit lines, Tron legacy digital world light cycle suit' },
    ],
  },
  {
    label: '🧙 Fantasy & Magical',
    options: [
      { label: 'Wizard grand robe', prompt: 'Flowing wizard grand robe in deep purple with gold stars and moons, long sleeves, pointed collar' },
      { label: 'Druid leaf cloak', prompt: 'Forest druid cloak made of interwoven green leaves and vines, natural woodland camouflage' },
      { label: 'Necromancer dark robes', prompt: 'Dark necromancer robes in black and deep purple, tattered edges, skull clasps, death magic aura' },
      { label: 'Elven silver tunic', prompt: 'Elegant elven tunic in silver-grey with intricate leaf embroidery, lightweight enchanted elven cloth' },
      { label: 'Alchemist coat', prompt: 'Alchemist leather coat with potion vials in belt loops, stained from experiments, mystic symbols' },
      { label: 'Enchanted crystal armor', prompt: 'Armor made of glowing magical crystals, translucent gem-like plates in blue and purple, fantasy' },
    ],
  },
  {
    label: '🎭 Costumes & Characters',
    options: [
      { label: 'Superhero spandex suit', prompt: 'Colorful superhero spandex bodysuit with bold chest emblem, cape, bright primary colors' },
      { label: 'Ninja stealth outfit', prompt: 'Black ninja stealth outfit with wrapped cloth, utility belt, face covering, shadow warrior' },
      { label: 'Pirate captain coat', prompt: 'Pirate captain long coat in dark red with gold trim, brass buttons, weathered sea-worn look' },
      { label: 'Cowboy duster jacket', prompt: 'Long brown leather cowboy duster coat, worn and dusty, western frontier outlaw style' },
      { label: 'Detective trench coat', prompt: 'Classic noir detective tan trench coat with belt, popped collar, mysterious investigator look' },
      { label: 'Jungle explorer vest', prompt: 'Khaki jungle explorer vest with many pockets, compass, and binoculars, adventure gear' },
    ],
  },
  {
    label: '👷 Uniforms & Work',
    options: [
      { label: 'Chef double-breasted coat', prompt: 'White chef double-breasted coat with cloth buttons, kitchen uniform, professional cook attire' },
      { label: 'Doctor lab coat', prompt: 'White doctor lab coat with stethoscope around neck, hospital ID badge, medical professional' },
      { label: 'Pilot flight suit', prompt: 'Military pilot flight suit in olive green with patches, survival vest, aviator jumpsuit' },
      { label: 'Racing driver jumpsuit', prompt: 'Racing driver fireproof jumpsuit covered in sponsor logos, colorful motorsport uniform' },
      { label: 'Construction hi-vis vest', prompt: 'Orange high-visibility construction worker vest with reflective strips over work clothes' },
      { label: 'Prison jumpsuit', prompt: 'Orange prison jumpsuit with stenciled numbers on chest, institutional correctional facility uniform' },
    ],
  },
  {
    label: '🏋️ Sports & Athletic',
    options: [
      { label: 'Boxing robe & gloves', prompt: 'Satin boxing robe with hood and boxing gloves, champion fighter walk-out outfit' },
      { label: 'Basketball jersey', prompt: 'Sleeveless basketball jersey with number and team name, athletic mesh fabric, NBA style' },
      { label: 'Football pads & jersey', prompt: 'American football jersey with shoulder pads underneath, team colors, NFL game day gear' },
      { label: 'Martial arts gi', prompt: 'White martial arts gi karate uniform with black belt, traditional dojo training outfit' },
      { label: 'Wrestling singlet', prompt: 'Tight wrestling singlet one-piece in bold colors, athletic competition bodysuit, Olympic style' },
      { label: 'Hockey jersey & pads', prompt: 'Ice hockey jersey with shoulder and elbow pads, team logo on chest, NHL game uniform' },
    ],
  },
  {
    label: '🌍 Cultural & Traditional',
    options: [
      { label: 'Japanese kimono', prompt: 'Traditional Japanese kimono robe with obi belt, ornate floral patterns, silk formal wear' },
      { label: 'Scottish kilt & jacket', prompt: 'Scottish Highland kilt in tartan plaid with formal Argyll jacket and sporran, Celtic dress' },
      { label: 'Hawaiian lei & shirt', prompt: 'Bright Hawaiian aloha shirt with tropical prints and flower lei garland around the neck' },
      { label: 'Mexican poncho', prompt: 'Colorful Mexican poncho with striped pattern and fringe edges, traditional serape blanket wear' },
      { label: 'Indian kurta', prompt: 'Ornate Indian kurta tunic with embroidered neckline, lightweight cotton formal wear, festive colors' },
      { label: 'Egyptian pharaoh tunic', prompt: 'Ancient Egyptian pharaoh royal tunic with gold collar necklace, white linen with gold trim' },
    ],
  },
  {
    label: '💀 Dark & Horror',
    options: [
      { label: 'Zombie torn rags', prompt: 'Torn and shredded zombie clothes with dirt and blood stains, decaying undead horror outfit' },
      { label: 'Vampire cape & vest', prompt: 'Gothic vampire outfit with high-collar black cape and red lining, Victorian vest, Dracula style' },
      { label: 'Mummy wrappings', prompt: 'Ancient Egyptian mummy wrappings, dirty aged linen bandages wrapped around the body, undead' },
      { label: 'Skeleton bone armor', prompt: 'Armor made from bones and skulls, skeletal rib cage chest piece, necromantic bone construction' },
      { label: 'Werewolf torn shirt', prompt: 'Shredded torn shirt from werewolf transformation, ripped fabric revealing fur, mid-transform horror' },
      { label: 'Ghostly translucent robes', prompt: 'Semi-transparent ghostly flowing robes, ethereal see-through spectral fabric, haunting spirit' },
    ],
  },
  {
    label: '🤪 Absurd & Meme',
    options: [
      { label: 'Banana costume', prompt: 'Full banana fruit costume, yellow banana bodysuit with brown top, comedy fruit outfit' },
      { label: 'Inflatable T-Rex suit', prompt: 'Inflatable T-Rex dinosaur costume, puffy oversized green dino suit, viral meme outfit' },
      { label: 'Cardboard box robot', prompt: 'Cardboard box robot costume with drawn-on buttons and dials, homemade craft project outfit' },
      { label: 'Bubble wrap bodysuit', prompt: 'Full bodysuit made of clear bubble wrap, see-through popping packaging material, absurd fashion' },
      { label: 'Trash bag couture', prompt: 'High fashion outfit made entirely from shiny black trash bags, garbage bag runway fashion' },
      { label: 'Barrel & suspenders', prompt: 'Classic wooden barrel with suspender straps, lost-everything cartoon poverty barrel outfit' },
    ],
  },
];

const HEAD_CREATE: AIStyleFamily[] = [
  {
    label: '⚔️ Helmets & Armor',
    options: [
      { label: 'Knight great helm', prompt: 'Medieval knight great helm bucket helmet with narrow eye slit and cross visor, full steel' },
      { label: 'Spartan corinthian helmet', prompt: 'Bronze Spartan corinthian helmet with tall red mohawk crest plume, Greek warrior' },
      { label: 'Samurai kabuto', prompt: 'Japanese samurai kabuto helmet with crescent moon crest, face guard mask, lacquered metal' },
      { label: 'Space marine helmet', prompt: 'Futuristic space marine full enclosed helmet, thick armored plating, glowing visor slit' },
      { label: 'Gladiator helm', prompt: 'Roman gladiator visored helmet with metal grill face guard and feather crest, arena fighter' },
      { label: 'Barbarian skull helm', prompt: 'Savage barbarian helmet made from a large animal skull with horns, bone and leather' },
    ],
  },
  {
    label: '👒 Hats & Classic',
    options: [
      { label: 'Top hat', prompt: 'Tall black silk top hat with satin ribbon band, formal Victorian gentleman headwear' },
      { label: 'Sombrero', prompt: 'Large wide-brimmed Mexican sombrero with colorful embroidered patterns and decorative trim' },
      { label: 'Ushanka fur hat', prompt: 'Russian ushanka winter fur hat with ear flaps, thick fur lining, Soviet cold weather gear' },
      { label: 'Safari pith helmet', prompt: 'White colonial safari pith helmet with chin strap, tropical sun protection, explorer headwear' },
      { label: 'Straw farmer hat', prompt: 'Wide-brimmed straw farmer hat, woven natural straw with leather chin cord, countryside look' },
      { label: 'Bowler derby hat', prompt: 'Classic black bowler derby hat with curved brim and rounded dome crown, English gentleman' },
    ],
  },
  {
    label: '👑 Crowns & Royalty',
    options: [
      { label: 'Jeweled royal crown', prompt: 'Ornate gold royal crown studded with large rubies, sapphires, and diamonds, velvet interior, king' },
      { label: 'Golden laurel wreath', prompt: 'Ancient Roman golden laurel wreath crown, delicate gold leaves in circular band, Caesar emperor' },
      { label: 'Pharaoh nemes headdress', prompt: 'Egyptian pharaoh striped nemes headdress in blue and gold with cobra uraeus on forehead' },
      { label: 'Ice queen tiara', prompt: 'Crystalline ice queen tiara with frozen icicle points and blue gemstones, frost magic royalty' },
      { label: 'Dark lord iron crown', prompt: 'Dark spiked iron crown with jagged points, dark metal with red glowing gems, evil lord headwear' },
      { label: 'Flower wreath crown', prompt: 'Beautiful flower wreath crown with roses, daisies, and small wildflowers woven together, nature' },
    ],
  },
  {
    label: '🐉 Fantasy & Creature',
    options: [
      { label: 'Dragon horns', prompt: 'Large curved dragon horns growing from the head, scaled bone in dark grey, fantasy creature' },
      { label: 'Angel halo', prompt: 'Glowing golden angel halo floating above the head, bright divine ring of light, heavenly holy' },
      { label: 'Demon skull helmet', prompt: 'Demonic skull helmet with curved horns and red glowing eyes, hellish bone headgear' },
      { label: 'Unicorn horn', prompt: 'Single spiraling unicorn horn growing from the forehead, pearlescent white with rainbow shimmer' },
      { label: 'Antler deer rack', prompt: 'Large deer antler rack growing from the head, natural brown bone antlers, forest spirit' },
      { label: 'Ram curved horns', prompt: 'Massive curved ram horns spiraling from the sides of the head, thick ridged bone, satyr' },
    ],
  },
  {
    label: '🤖 Sci-Fi & Tech',
    options: [
      { label: 'Robot dome head', prompt: 'Chrome robot dome helmet head covering, smooth metallic head with LED eye strips, android' },
      { label: 'Cyberpunk neural implant', prompt: 'Cyberpunk brain neural implant hardware on shaved head, wires, ports, and LED status lights' },
      { label: 'Astronaut fish bowl', prompt: 'Clear glass astronaut space helmet bubble, round fishbowl with reflection, space suit headgear' },
      { label: 'Antenna headband', prompt: 'Alien antenna headband with two bobbing antenna stalks on springs, cute alien costume piece' },
      { label: 'Mech pilot helmet', prompt: 'Mech pilot enclosed helmet with heads-up display visor, armored flight helmet, gundam style' },
      { label: 'AI brain chip visor', prompt: 'Sleek AI augmentation visor across the forehead with holographic data readout, transhumanist tech' },
    ],
  },
  {
    label: '🎪 Wild & Absurd',
    options: [
      { label: 'Bucket on head', prompt: 'Metal bucket turned upside down on the head as a makeshift helmet, improvised headgear' },
      { label: 'Traffic cone', prompt: 'Orange traffic cone worn on the head as a pointy hat, road construction cone party look' },
      { label: 'Pineapple hat', prompt: 'Whole pineapple fruit sitting on top of the head as a hat, tropical fruit headwear' },
      { label: 'Fish head hat', prompt: 'Large fish head worn as a hat, flopping fish with open mouth perched on head, absurd comedy' },
      { label: 'Shark fin', prompt: 'Grey shark dorsal fin attached to the top of the head, sticking straight up, Jaws reference' },
      { label: 'Toilet plunger', prompt: 'Rubber toilet plunger stuck to the top of the head, suction cup attached, comedy prop' },
    ],
  },
  {
    label: '🌍 Cultural & Traditional',
    options: [
      { label: 'Native war bonnet', prompt: 'Traditional Native American feathered war bonnet with long trailing eagle feathers, chief headdress' },
      { label: 'Turkish fez', prompt: 'Red Turkish fez hat with black tassel, flat-topped cylindrical ottoman headwear' },
      { label: 'Russian ushanka', prompt: 'Russian military ushanka fur hat with Soviet star emblem, ear flaps up, winter army hat' },
      { label: 'Viking horned helm', prompt: 'Iconic Viking horned helmet with two curved horns, iron and leather Norse warrior headgear' },
      { label: 'Chinese conical hat', prompt: 'Traditional Chinese conical straw hat, wide pointed cone shape, rice paddy farmer hat' },
      { label: 'Scottish tam o\'shanter', prompt: 'Scottish tam o\'shanter beret with pompom on top, tartan plaid fabric, Highland bonnet' },
    ],
  },
  {
    label: '💀 Dark & Horror',
    options: [
      { label: 'Skull bone helmet', prompt: 'Helmet carved from a large animal skull, bone white with hollow eye sockets, death warrior' },
      { label: 'Witch pointed hat', prompt: 'Classic witch pointed hat in black with wide brim, buckle band, Halloween witchcraft' },
      { label: 'Plague doctor hood', prompt: 'Black plague doctor hood and mask with long pointed beak, medieval pandemic outfit' },
      { label: 'Ghostly floating crown', prompt: 'Ethereal transparent ghostly crown floating above the head, spectral glowing spirit crown' },
      { label: 'Spider web veil', prompt: 'Black spider web lace veil draped over the head, Gothic spider silk with tiny spiders' },
      { label: 'Pumpkin head carved', prompt: 'Carved jack-o-lantern pumpkin on the head with glowing triangle eyes and mouth, Halloween' },
    ],
  },
  {
    label: '🏋️ Sport & Activity',
    options: [
      { label: 'Football helmet', prompt: 'American football helmet with face cage guard and team decal, matte finish, NFL style' },
      { label: 'Boxing headguard', prompt: 'Red leather boxing headguard with cheek protectors and chin strap, sparring protection' },
      { label: 'Cycling aero helmet', prompt: 'Aerodynamic cycling time-trial helmet with pointed tail, sleek ventilated road bike helmet' },
      { label: 'Ski helmet with goggles', prompt: 'White ski helmet with attached orange mirror goggles on the forehead, winter sport gear' },
      { label: 'Scuba diving mask', prompt: 'Scuba diving full face mask with breathing regulator, underwater diving equipment' },
      { label: 'Baseball batting helmet', prompt: 'Baseball batting helmet with one ear flap, glossy team color, MLB batter protection' },
    ],
  },
  {
    label: '🍔 Food & Object',
    options: [
      { label: 'Cheese wheel hat', prompt: 'Large cheese wheel wedge hat on the head, yellow cheddar with holes, Packers cheesehead style' },
      { label: 'Watermelon helmet', prompt: 'Carved-out watermelon half worn as a helmet, green rind outside with red fruit visible' },
      { label: 'Spaghetti bowl hat', prompt: 'Bowl of spaghetti and meatballs balanced on the head, pasta dangling over the sides' },
      { label: 'Birthday cake hat', prompt: 'Tiered birthday cake with frosting and lit candles perched on the head, party celebration' },
      { label: 'Popcorn bucket hat', prompt: 'Large movie theater popcorn bucket on the head, overflowing popped kernels, cinema snack' },
      { label: 'Ice cream cone hat', prompt: 'Large ice cream waffle cone on the head with scoops of colorful ice cream and sprinkles' },
    ],
  },
];

const BACKGROUND_CREATE: AIStyleFamily[] = [
  {
    label: '🌆 City & Urban',
    options: [
      { label: 'Tokyo neon alley', prompt: 'Narrow Tokyo alley at night, neon shop signs on left and right sides in pink and blue, Japanese lanterns on edges, open center, flat color cartoon drawing' },
      { label: 'Cyberpunk rain street', prompt: 'Dark cyberpunk city street, neon signs and buildings on left and right sides, rain lines, puddles on ground, open center, flat cartoon illustration' },
      { label: 'NYC rooftop sunset', prompt: 'City rooftop at sunset, buildings on left and right edges, warm orange sky with simple clouds at top, open center, flat cartoon drawing style' },
      { label: 'London fog alley', prompt: 'Foggy London cobblestone alley, brick buildings on left and right, street lamp on one side, thick fog, open center, flat cartoon illustration' },
      { label: 'Paris rooftop café', prompt: 'Paris rooftop with small café table on one side, Eiffel Tower in far background, iron railings on edges, open center, flat cartoon drawing' },
      { label: 'Las Vegas strip', prompt: 'Las Vegas strip at night, casino signs and bright lights on left and right, neon glow, open center, flat cartoon illustration' },
    ],
  },
  {
    label: '🏝️ Nature & Wild',
    options: [
      { label: 'Tropical beach sunset', prompt: 'Tropical beach at sunset, palm trees on left and right edges, orange sky at top, turquoise water and sand at bottom, open center, flat cartoon illustration' },
      { label: 'Coral reef underwater', prompt: 'Underwater coral reef, colorful corals on left and right edges in orange and purple, small fish on sides, blue water fill, open center, flat cartoon style' },
      { label: 'Dense jungle', prompt: 'Dense tropical jungle, giant fern leaves and vines on left and right edges, exotic flowers on sides, green canopy at top, open center, flat cartoon illustration' },
      { label: 'Cherry blossom garden', prompt: 'Japanese zen garden, cherry blossom tree on one side, raked sand and rocks on edges, soft dawn sky, open center, flat cartoon drawing' },
      { label: 'Waterfall cave', prompt: 'Cave behind a waterfall, rocky walls on left and right, water curtain in front, moss and ferns on edges, open center, flat cartoon illustration' },
      { label: 'Northern lights tundra', prompt: 'Arctic tundra at night, snowy ground, green and purple aurora borealis in sky, pine trees on edges, open center, flat cartoon drawing' },
    ],
  },
  {
    label: '🏰 Historical & Fantasy',
    options: [
      { label: 'Castle throne room', prompt: 'Medieval castle throne room, stone walls with torches on left and right sides, red carpet on floor, golden throne in far back, open center, flat cartoon drawing' },
      { label: 'Egyptian temple', prompt: 'Ancient Egyptian temple, hieroglyphic stone columns on left and right, torches on walls, sandstone floor, open center, flat cartoon style' },
      { label: 'Greek ruins', prompt: 'Greek temple ruins, marble columns on left and right, blue sky at top, olive trees on edges, open center, flat cartoon style' },
      { label: 'Viking longhouse', prompt: 'Viking longhouse interior, wooden beams and shields on walls left and right, fire pit in center back, open center, flat cartoon drawing' },
      { label: 'Wizard library', prompt: 'Grand wizard library interior, tall bookshelves on left and right walls, floating candles, magical glow, open center, flat cartoon drawing' },
      { label: 'Samurai dojo', prompt: 'Japanese samurai dojo training hall, wooden walls with hanging katanas on sides, tatami floor, open center, flat cartoon illustration' },
    ],
  },
  {
    label: '🚀 Sci-Fi & Space',
    options: [
      { label: 'Spaceship cockpit', prompt: 'Futuristic spaceship cockpit interior, control panels on left and right edges, starfield through viewport in back, open center, flat cartoon illustration' },
      { label: 'Moon surface', prompt: 'Lunar surface, grey craters on left and right sides, Earth visible in top corner, black starry sky, open center, flat cartoon illustration' },
      { label: 'Mars colony', prompt: 'Mars colony base, red rocky terrain on edges, dome habitats on sides, rust-colored sky at top, open center, flat cartoon style' },
      { label: 'Space nebula', prompt: 'Deep space nebula, swirling purple and pink gas clouds on edges, scattered stars, dark void center, flat cartoon illustration' },
      { label: 'Asteroid field', prompt: 'Asteroid field in space, grey and brown space rocks floating on edges, distant stars, dark space, open center, flat cartoon drawing' },
      { label: 'Alien planet jungle', prompt: 'Alien planet with bioluminescent plants on edges, glowing mushrooms and strange flora, purple sky, open center, flat cartoon illustration' },
    ],
  },
  {
    label: '🏠 Indoor Scenes',
    options: [
      { label: 'Cozy cabin fireplace', prompt: 'Wooden cabin interior, stone fireplace on one side, bookshelves on other side, warm orange glow, open center floor, flat cartoon drawing' },
      { label: 'Trading desk monitors', prompt: 'Trading room, monitors with green charts on left and right sides, desk on bottom edge, dark room lit by screens, open center, flat cartoon style' },
      { label: 'Retro arcade room', prompt: 'Retro arcade room, gaming cabinets on left and right sides, colorful pixel screens glowing, purple ambient light, open center floor, flat cartoon style' },
      { label: 'Grand library', prompt: 'Grand library interior, tall bookshelves on left and right walls, reading lamp on side, warm lighting, open center, flat cartoon drawing' },
      { label: 'Jazz lounge', prompt: 'Dim jazz lounge, leather booth seating on sides, stage with microphone in back, blue mood lighting, open center, flat cartoon illustration' },
      { label: 'Ramen shop kitchen', prompt: 'Japanese ramen shop interior, kitchen counter on one side, menu boards and lanterns on edges, steamy warm, open center, flat cartoon drawing' },
    ],
  },
  {
    label: '⚡ Action & Extreme',
    options: [
      { label: 'Volcano eruption', prompt: 'Volcano crater, dark rock walls on left and right, orange lava flowing on edges, red glow at top, open center, flat cartoon illustration' },
      { label: 'Thunderstorm', prompt: 'Dark thunderstorm sky, heavy rain, lightning bolt on one side, storm clouds at top, wind-blown trees on edges, open center, flat cartoon drawing' },
      { label: 'Boxing ring', prompt: 'Boxing ring, ropes and corner posts on left and right, spotlight from top, crowd silhouettes on edges, open center, flat cartoon style' },
      { label: 'Gladiator arena', prompt: 'Roman gladiator arena, stone colosseum walls on left and right, roaring crowd at top, sandy floor, open center, flat cartoon illustration' },
      { label: 'Zombie apocalypse street', prompt: 'Post-apocalyptic zombie street, abandoned cars and broken buildings on left and right, dark sky, debris on edges, open center, flat cartoon drawing' },
      { label: 'Pirate battle at sea', prompt: 'Pirate ship deck during sea battle, ship railings on left and right, cannon smoke, stormy ocean, open center, flat cartoon illustration' },
    ],
  },
  {
    label: '🌀 Abstract & Surreal',
    options: [
      { label: 'Vaporwave grid', prompt: 'Retro vaporwave grid landscape, neon pink and cyan grid lines, setting sun, palm trees on edges, open center, flat cartoon style' },
      { label: 'Floating island', prompt: 'Magical floating island, green grass on top, blue sky with simple clouds on sides, open center, flat cartoon drawing' },
      { label: 'Crystal cave', prompt: 'Crystalline cave interior, large amethyst and quartz crystal formations on left and right walls, purple glow, open center, flat cartoon illustration' },
      { label: 'Neon tunnel', prompt: 'Infinite neon light tunnel, glowing ring lights in pink and blue receding into distance, dark void center, flat cartoon style' },
      { label: 'Geometric void', prompt: 'Abstract geometric void, floating polyhedron shapes on edges, dark space with colored light beams, open center, flat cartoon drawing' },
      { label: 'Infinite mirror room', prompt: 'Infinite mirror room, reflective walls on all sides creating endless reflections, LED lights, open center, flat cartoon illustration' },
    ],
  },
  {
    label: '💰 Crypto & Meme',
    options: [
      { label: 'Stonks trading floor', prompt: 'Stock exchange trading floor, screens with green charts on walls left and right, ticker tape, trading desks on edges, open center, flat cartoon illustration' },
      { label: 'Mining rig warehouse', prompt: 'Crypto mining warehouse, rows of GPU mining rigs on left and right with blinking lights, cables, server racks, open center, flat cartoon drawing' },
      { label: 'Lambo garage', prompt: 'Luxury garage with Lamborghini sports car on one side, polished floor, neon lighting on walls, open center, flat cartoon illustration' },
      { label: 'Diamond vault', prompt: 'Bank vault interior, thick vault door on one side, gold bars and diamonds stacked on edges, steel walls, open center, flat cartoon style' },
      { label: 'Dumpster fire alley', prompt: 'Dark back alley with literal dumpster on fire on one side, brick walls, trash bags on edges, night sky, open center, flat cartoon drawing' },
      { label: 'NFT gallery hall', prompt: 'Modern NFT art gallery, framed digital art on walls left and right, spotlight lighting, polished floor, open center, flat cartoon illustration' },
    ],
  },
  {
    label: '🎪 Entertainment',
    options: [
      { label: 'Concert stage', prompt: 'Concert stage, speakers and light rigs on left and right, crowd silhouettes below, spotlights from top, open center stage, flat cartoon illustration' },
      { label: 'Movie theater', prompt: 'Movie theater interior, rows of red seats on edges, large screen in back, dark room with projector light, open center, flat cartoon drawing' },
      { label: 'Sports stadium', prompt: 'Sports stadium, bleacher seats with crowd on left and right, bright floodlights at top, green field below, open center, flat cartoon style' },
      { label: 'Theme park', prompt: 'Colorful theme park, roller coaster tracks on one side, ferris wheel on other, carnival lights on edges, open center, flat cartoon illustration' },
      { label: 'Bowling alley', prompt: 'Retro bowling alley, lanes on left and right with pins at end, neon scoring screens above, polished wood floor, open center, flat cartoon drawing' },
      { label: 'Rooftop pool party', prompt: 'Rooftop pool party at sunset, pool edge on one side, lounge chairs and palm trees on edges, city skyline behind, open center, flat cartoon illustration' },
    ],
  },
];

// --- Assemble the full catalog ---

export const AI_PRESET_CATALOG: Partial<Record<AICategory, AICategoryPresets>> = {
  clothes: {
    enhance: [...UNIVERSAL_ENHANCE, ...CLOTHES_ENHANCE],
    create_new: CLOTHES_CREATE,
  },
  head: {
    enhance: [...UNIVERSAL_ENHANCE, ...HEAD_ENHANCE],
    create_new: HEAD_CREATE,
  },
  background: {
    create_new: BACKGROUND_CREATE,
  },
};

// --- Randomizer ---

export function getRandomPreset(
  category: AICategory,
  mode: 'enhance' | 'create_new',
): { family: AIStyleFamily; option: { label: string; prompt: string } } | null {
  const presets = AI_PRESET_CATALOG[category];
  if (!presets) return null;
  const families = mode === 'enhance' ? presets.enhance : presets.create_new;
  if (!families || families.length === 0) return null;

  const family = families[Math.floor(Math.random() * families.length)];
  const option = family.options[Math.floor(Math.random() * family.options.length)];
  return { family, option };
}
