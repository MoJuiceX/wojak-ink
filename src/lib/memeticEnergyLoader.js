/**
 * Loader for Memetic Energy images from /memetic-energy/ folder
 * This is separate from the wojak-creator folder which is used by the Wojak Generator
 */

// Memetic Energy folder structure mapping
const MEMETIC_ENERGY_CATEGORIES = {
  'Background': {
    '$CASHTAG': [
      '$BEPE.png',
      '$CASTER.png',
      '$CHIA.png',
      '$HOA.png',
      '$HONK.png',
      '$LOVE.png',
      '$NECKCOIN.png',
      '$PIZZA.png'
    ],
    'Plain Backgrounds': [
      'Chia Green.png',
      'Golden Hour.png',
      'Green Candle.png',
      'Hot Coral_.png',
      'Mellow Yellow.png',
      'Neo Mint.png',
      'Radioactive Forest.png',
      'Sky Dive.png',
      'Sky Shock Blue_.png',
      'Tangerine Pop_.png'
    ],
    'Scene': [
      'Bepe Barracks.png',
      'Chia Farm.png',
      'Hell.png',
      'Matrix.png',
      'MomΓÇÖs Basement.png',
      'Moon.png',
      'Nesting Grounds.png',
      'NYSE Dump.png',
      'NYSE Pump.png',
      'One Market.png',
      'Orange Grove.png',
      'Ronin Dojo.png',
      'Route 66.png',
      'Silicon.net Data Center.png',
      'Spell Room.png',
      'White House.png'
    ]
  },
  'Base': {
    '': [
      'BASE_Wojak_Bepe Army.png',
      'BASE_Wojak_Born to Ride.png',
      'BASE_Wojak_Chia Farmer.png',
      'BASE_Wojak_El Presidente.png',
      'BASE_Wojak_Leather Jacket.png',
      'BASE_Wojak_Ninja Turtle.png',
      'BASE_Wojak_Ronin.png',
      'BASE_Wojak_Sports Jacket.png',
      'BASE_Wojak_SWAT Gear.png',
      'BASE_Wojak_Tee_blue.png',
      'BASE_Wojak_Tee_orange.png',
      'BASE_Wojak_Topless.png',
      'BASE_Wojak_Wizard Fit_blue.png',
      'BASE_Wojak_Wizard Fit_orange.png',
      'BASE_Wojak_Wizard Fit_purple.png'
    ]
  },
  'Eyes': {
    '': [
      'EYE_3D Glasses_.png',
      'EYE_Alpha Shades_.png',
      'EYE_Aviators_.png',
      'Eye_Cool Glasses_.png',
      'EYE_Cyber Shades_.png',
      'EYE_Cyber Shades_black.png',
      'EYE_Eye Patch_.png',
      'EYE_Matrix Lenses_.png',
      'EYE_MOG Glasses.png',
      'EYE_Night Vision_.png',
      'EYE_Tyson Tattoo_.png',
      'EYE_VR Headset_.png',
      'EYE_VR Headset_staker.png',
      'EYE_Wizard Glasses_NEW.png',
      'EYES_Green laser.png',
      'EYES_Ninja Turtle mask.png',
      'EYES_Shades_.png'
    ]
  },
  'Head': {
    '': [
      'HEAD_2Pac Bandana_.png',
      'HEAD_Beanie_.png',
      'HEAD_Cap_Chia.png',
      'HEAD_Cap_McD.png',
      'HEAD_Centurion_.png',
      'HEAD_Clown_.png',
      'HEAD_Comrade Cap_.png',
      'HEAD_Construction Helmet_.png',
      'HEAD_Cowboy Hat_.png',
      'HEAD_Crown_.png',
      'HEAD_Devil Horns.png',
      'HEAD_Fedora_Orange.png',
      'HEAD_Fedora_Purple.png',
      'HEAD_Field Cap_.png',
      'HEAD_Firefigther Helmet_.png',
      'HEAD_Hard Hat_.png',
      'HEAD_Headphones_.png',
      'HEAD_Military Beret_.png',
      'HEAD_Piccolo Hat_.png',
      'HEAD_Propeller Hat_.png',
      'HEAD_Ronin Helmet.png',
      'HEAD_Super Mario Luigi_.png',
      'HEAD_Super Mario_.png',
      'HEAD_Super Saiyan_.png',
      'HEAD_SWAT Helmet.png',
      'HEAD_Tin Foil_.png',
      'HEAD_Trump Wave_.png',
      'HEAD_Vikings Hat_.png',
      'HEAD_Wizard Hat_orange.png',
      'HEAD_Wizard Hat_pink.png',
      'HEAD_Wizard Hat_red.png'
    ]
  },
  'Mouth': {
    '': [
      'MOUTH_Bandana Mask_.png',
      'MOUTH_Bubble Gum_.png',
      'MOUTH_Cig_.png',
      'MOUTH_Cohiba_.png',
      'MOUTH_Copium Mask.png',
      'MOUTH_Drac teeth.png',
      'MOUTH_Gold Teeth.png',
      'MOUTH_Hannibal Mask.png',
      'MOUTH_Joint_.png',
      'MOUTH_Neckbeards_black.png',
      'MOUTH_Neckbeards_grey.png',
      'MOUTH_Numb.png',
      'MOUTH_Pipe.png',
      'MOUTH_Pizza.png',
      'MOUTH_Screeming.png',
      'MOUTH_Smile.png',
      'MOUTH_Stach.png',
      'MOUTH_Teeth.png'
    ]
  }
}

/**
 * Clean display name from filename
 * @param {string} fileName - The filename
 * @param {string} categoryName - The category name
 * @returns {string} Cleaned display name
 */
function cleanDisplayName(fileName, categoryName) {
  let name = fileName.replace('.png', '')
  
  // Remove common prefixes
  name = name
    .replace(/^BASE_Wojak_/g, '')
    .replace(/^EYE_|^EYES_/g, '')
    .replace(/^HEAD_/g, '')
    .replace(/^MOUTH_/g, '')
    .replace(/^\$/g, '') // Remove $ from cashtag names
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim()
  
  return name || fileName.replace('.png', '')
}

/**
 * Get image path for memetic energy folder
 * @param {string} categoryName - Category name (Background, Base, Eyes, Head, Mouth)
 * @param {string} subfolder - Subfolder name (empty string for direct files)
 * @param {string} fileName - Filename
 * @returns {string} Full path to image
 */
function getImagePath(categoryName, subfolder, fileName) {
  let path = `/memetic-energy/${categoryName}/`
  
  if (subfolder && subfolder !== '') {
    path += `${subfolder}/`
  }
  
  path += fileName
  
  return path
}

/**
 * Get all images for a category, flattened (no subfolder organization)
 * @param {string} categoryName - Category name (Background, Base, Eyes, Head, Mouth)
 * @returns {Array} Array of image objects with name, path, and displayName
 */
export function getAllMemeticEnergyImages(categoryName) {
  const categoryData = MEMETIC_ENERGY_CATEGORIES[categoryName]
  if (!categoryData) return []

  const allImages = []
  
  Object.keys(categoryData).forEach(subfolder => {
    const files = categoryData[subfolder]
    files.forEach(fileName => {
      const name = fileName.replace('.png', '')
      const path = getImagePath(categoryName, subfolder, fileName)
      
      allImages.push({
        name,
        path,
        displayName: cleanDisplayName(fileName, categoryName),
        fileName: fileName,
        category: categoryName,
        subfolder: subfolder || null
      })
    })
  })

  return allImages
}

/**
 * Get available categories
 * @returns {Array} Array of category names
 */
export function getMemeticEnergyCategories() {
  return Object.keys(MEMETIC_ENERGY_CATEGORIES)
}


