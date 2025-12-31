import React, { useState, useEffect, memo, useRef } from 'react';
import { useWindow } from '../contexts/WindowContext';
import { useToast } from '../contexts/ToastContext';
import { ensureOrangeAudioUnlocked, playOrangeClickSound } from '../utils/orangeSound';
import './WojakRarityExplorer.css';

// Cluster-based tier assignments - tiers determined by natural gaps within each category
const TRAIT_TIER_LOOKUP = {
  "Base": {
    "Alien Waifu": "legendary",
    "Alien Baddie": "legendary",
    "Bepe Waifu": "legendary",
    "Bepe Baddie": "legendary",
    "Alien Soyjak": "rare",
    "Bepe Soyjak": "rare",
    "Alien Wojak": "rare",
    "Bepe Wojak": "rare",
    "Baddie": "uncommon",
    "Monkey Zoo": "uncommon",
    "Waifu": "uncommon",
    "Papa Tang": "uncommon",
    "Soyjak": "common",
    "Wojak": "common"
  },
  "Face": {
    "NPC": "legendary",
    "Bleeding Bags": "rare",
    "Rugged": "rare",
    "Terminator": "rare",
    "Rekt": "uncommon",
    "Classic": "common"
  },
  "Mouth": {
    "Sexy Lip Bite": "legendary",
    "Hannibal Mask": "legendary",
    "Stunned": "legendary",
    "Copium Mask": "rare",
    "Bandana Mask": "rare",
    "Stache": "rare",
    "Vampire Teeth": "rare",
    "Glossed Lips": "rare",
    "Smile": "uncommon",
    "Pipe": "uncommon",
    "Neckbeard": "uncommon",
    "Bubble Gum": "uncommon",
    "Pizza": "uncommon",
    "Teeth": "uncommon",
    "Gold Teeth": "common",
    "Cohiba": "common",
    "Joint": "common",
    "Screaming": "common",
    "Cig": "common",
    "Numb": "common"
  },
  "Face Wear": {
    "Fake It Mask": "legendary",
    "VR Headset": "legendary",
    "Tyson Tattoo": "rare",
    "Night Vision": "rare",
    "Eye Patch": "rare",
    "Ninja Turtle Mask": "uncommon",
    "Wizard Glasses": "uncommon",
    "Laser Eyes": "uncommon",
    "Cyber Shades": "uncommon",
    "Cool Glasses": "uncommon",
    "3D Glasses": "uncommon",
    "Matrix Lenses": "uncommon",
    "Clown Nose": "uncommon",
    "Aviators": "uncommon",
    "Alpha Shades": "uncommon",
    "Shades": "uncommon",
    "MOG Glasses": "uncommon",
    "No Face Wear": "common"
  },
  "Head": {
    "Piccolo Turban": "legendary",
    "Headphones": "legendary",
    "Soy Hair": "legendary",
    "2Pac Bandana": "legendary",
    "Tiara": "legendary",
    "Standard Cut": "legendary",
    "Power Bob": "legendary",
    "Twin Braids": "legendary",
    "Ponytail": "legendary",
    "Vixen Waves": "legendary",
    "Mermaid Waves": "legendary",
    "Hip Hop Hat": "rare",
    "Beanie": "rare",
    "Halo": "rare",
    "Comrade Hat": "rare",
    "Trump Wave": "rare",
    "Beer Hat": "rare",
    "Spikes": "rare",
    "Cowboy Hat": "rare",
    "Devil Horns": "rare",
    "Super Wojak Hat": "rare",
    "Hard Hat": "rare",
    "Pirate Hat": "rare",
    "Firefighter Helmet": "uncommon",
    "Fedora": "uncommon",
    "Tin Foil Hat": "uncommon",
    "SWAT Helmet": "uncommon",
    "Field Cap": "uncommon",
    "Cap": "uncommon",
    "Ronin Helmet": "uncommon",
    "Centurion": "uncommon",
    "Viking Helmet": "uncommon",
    "Propeller Hat": "uncommon",
    "Crown": "uncommon",
    "Construction Helmet": "uncommon",
    "Clown": "uncommon",
    "Military Beret": "uncommon",
    "Super Saiyan": "uncommon",
    "Wizard Hat": "uncommon",
    "No Headgear": "common"
  },
  "Clothes": {
    "Piccolo Uniform": "legendary",
    "School Uniform": "legendary",
    "Prom Dress": "legendary",
    "Denim Vest": "legendary",
    "Sonic Suit": "rare",
    "Astronaut": "rare",
    "El Presidente": "rare",
    "Pickle Suit": "rare",
    "Vintage Dress": "rare",
    "Bepe Suit": "rare",
    "Goose Suit": "rare",
    "Sports Bra": "rare",
    "Pepe Suit": "rare",
    "Straitjacket": "uncommon",
    "God's Robe": "uncommon",
    "Gopher Suit": "uncommon",
    "Firefighter Uniform": "uncommon",
    "Drac": "uncommon",
    "Proof of Prayer": "uncommon",
    "Tank Top": "uncommon",
    "Tee": "uncommon",
    "Bathrobe": "uncommon",
    "SWAT Gear": "uncommon",
    "Viking Armor": "uncommon",
    "Ninja Turtle Fit": "uncommon",
    "Ronin": "common",
    "Super Saiyan Uniform": "common",
    "Roman Drip": "common",
    "Wizard Drip": "common",
    "Leather Jacket": "common",
    "Born to Ride": "common",
    "Bepe Army": "common",
    "Chia Farmer": "common",
    "Suit": "common",
    "Sports Jacket": "common",
    "Topless": "common"
  },
  "Background": {
    "Signal Lost": "legendary",
    "Crazy Room": "legendary",
    "Rainforest": "legendary",
    "Morning Routine": "rare",
    "$HONK": "rare",
    "Everythings Fine": "rare",
    "Rome": "rare",
    "$CASTER": "rare",
    "Ronin Dojo": "rare",
    "NYSE Rug": "rare",
    "White House": "rare",
    "$NECKCOIN": "uncommon",
    "$PIZZA": "uncommon",
    "Nesting Grounds": "uncommon",
    "Spell Room": "uncommon",
    "Moms Basement": "uncommon",
    "NYSE Dump": "uncommon",
    "Silicon Data Center": "uncommon",
    "Route 66": "uncommon",
    "Price Up": "uncommon",
    "NYSE Pump": "uncommon",
    "Pirate Ship": "uncommon",
    "Price Down": "uncommon",
    "One Market": "uncommon",
    "$BEPE": "uncommon",
    "Golden Hour": "uncommon",
    "Chia Farm": "uncommon",
    "Heaven": "uncommon",
    "$LOVE": "uncommon",
    "Hot Coral": "uncommon",
    "Matrix": "uncommon",
    "Hell": "uncommon",
    "Radioactive Forest": "uncommon",
    "Mellow Yellow": "uncommon",
    "$HOA": "common",
    "Orange Grove": "common",
    "Bepe Barracks": "common",
    "Tangerine Pop": "common",
    "Moon": "common",
    "Neo Mint": "common",
    "Green Candle": "common",
    "Sky Shock Blue": "common",
    "Sky Dive": "common",
    "$CHIA": "common",
    "Chia Green": "common"
  }
};

// Tier lookup function
const getTraitTier = (traitName, category) => {
  if (!traitName || !category) {
    return 'common';
  }
  const categoryLookup = TRAIT_TIER_LOOKUP[category];
  if (categoryLookup && categoryLookup[traitName]) {
    return categoryLookup[traitName];
  }
  return 'common';
};

const rarityData = {
  "Base": [
    { name: "Wojak", count: 1996, pct: 47.52, tier: "common" },
    { name: "Soyjak", count: 750, pct: 17.86, tier: "common" },
    { name: "Waifu", count: 250, pct: 5.95, tier: "uncommon" },
    { name: "Papa Tang", count: 250, pct: 5.95, tier: "uncommon" },
    { name: "Baddie", count: 200, pct: 4.76, tier: "rare" },
    { name: "Monkey Zoo", count: 200, pct: 4.76, tier: "rare" },
    { name: "Bepe Wojak", count: 124, pct: 2.95, tier: "rare" },
    { name: "Alien Wojak", count: 100, pct: 2.38, tier: "rare" },
    { name: "Bepe Soyjak", count: 96, pct: 2.29, tier: "rare" },
    { name: "Alien Soyjak", count: 80, pct: 1.90, tier: "rare" },
    { name: "Bepe Waifu", count: 42, pct: 1.00, tier: "rare" },
    { name: "Bepe Baddie", count: 42, pct: 1.00, tier: "rare" },
    { name: "Alien Waifu", count: 35, pct: 0.83, tier: "legendary" },
    { name: "Alien Baddie", count: 35, pct: 0.83, tier: "legendary" }
  ],
  "Face": [
    { name: "Classic", count: 2080, pct: 49.52, tier: "common" },
    { name: "Rekt", count: 654, pct: 15.57, tier: "common" },
    { name: "Terminator", count: 435, pct: 10.36, tier: "uncommon" },
    { name: "Rugged", count: 413, pct: 9.83, tier: "uncommon" },
    { name: "Bleeding Bags", count: 364, pct: 8.67, tier: "uncommon" },
    { name: "NPC", count: 254, pct: 6.05, tier: "uncommon" }
  ],
  "Mouth": [
    { name: "Numb", count: 490, pct: 11.67, tier: "uncommon" },
    { name: "Cig", count: 414, pct: 9.86, tier: "uncommon" },
    { name: "Screaming", count: 348, pct: 8.29, tier: "uncommon" },
    { name: "Joint", count: 303, pct: 7.21, tier: "uncommon" },
    { name: "Cohiba", count: 302, pct: 7.19, tier: "uncommon" },
    { name: "Gold Teeth", count: 275, pct: 6.55, tier: "uncommon" },
    { name: "Teeth", count: 248, pct: 5.90, tier: "uncommon" },
    { name: "Pizza", count: 220, pct: 5.24, tier: "uncommon" },
    { name: "Bubble Gum", count: 187, pct: 4.45, tier: "rare" },
    { name: "Neckbeard", count: 184, pct: 4.38, tier: "rare" },
    { name: "Pipe", count: 183, pct: 4.36, tier: "rare" },
    { name: "Smile", count: 179, pct: 4.26, tier: "rare" },
    { name: "Glossed Lips", count: 147, pct: 3.50, tier: "rare" },
    { name: "Vampire Teeth", count: 146, pct: 3.48, tier: "rare" },
    { name: "Stache", count: 138, pct: 3.29, tier: "rare" },
    { name: "Bandana Mask", count: 106, pct: 2.52, tier: "rare" },
    { name: "Copium Mask", count: 105, pct: 2.50, tier: "rare" },
    { name: "Stunned", count: 90, pct: 2.14, tier: "rare" },
    { name: "Hannibal Mask", count: 76, pct: 1.81, tier: "rare" },
    { name: "Sexy Lip Bite", count: 59, pct: 1.40, tier: "rare" }
  ],
  "Face Wear": [
    { name: "No Face Wear", count: 1490, pct: 35.48, tier: "common" },
    { name: "MOG Glasses", count: 302, pct: 7.19, tier: "uncommon" },
    { name: "Shades", count: 267, pct: 6.36, tier: "uncommon" },
    { name: "Alpha Shades", count: 222, pct: 5.29, tier: "uncommon" },
    { name: "Aviators", count: 194, pct: 4.62, tier: "rare" },
    { name: "Matrix Lenses", count: 180, pct: 4.29, tier: "rare" },
    { name: "Clown Nose", count: 180, pct: 4.29, tier: "rare" },
    { name: "3D Glasses", count: 164, pct: 3.90, tier: "rare" },
    { name: "Cool Glasses", count: 161, pct: 3.83, tier: "rare" },
    { name: "Cyber Shades", count: 157, pct: 3.74, tier: "rare" },
    { name: "Laser Eyes", count: 149, pct: 3.55, tier: "rare" },
    { name: "Wizard Glasses", count: 145, pct: 3.45, tier: "rare" },
    { name: "Ninja Turtle Mask", count: 143, pct: 3.40, tier: "rare" },
    { name: "Eye Patch", count: 122, pct: 2.90, tier: "rare" },
    { name: "Night Vision", count: 121, pct: 2.88, tier: "rare" },
    { name: "Tyson Tattoo", count: 97, pct: 2.31, tier: "rare" },
    { name: "VR Headset", count: 67, pct: 1.60, tier: "rare" },
    { name: "Fake It Mask", count: 39, pct: 0.93, tier: "legendary" }
  ],
  "Head": [
    { name: "No Headgear", count: 643, pct: 15.31, tier: "common" },
    { name: "Wizard Hat", count: 248, pct: 5.90, tier: "uncommon" },
    { name: "Super Saiyan", count: 195, pct: 4.64, tier: "rare" },
    { name: "Military Beret", count: 164, pct: 3.90, tier: "rare" },
    { name: "Clown", count: 143, pct: 3.40, tier: "rare" },
    { name: "Crown", count: 140, pct: 3.33, tier: "rare" },
    { name: "Construction Helmet", count: 140, pct: 3.33, tier: "rare" },
    { name: "Propeller Hat", count: 137, pct: 3.26, tier: "rare" },
    { name: "Viking Helmet", count: 135, pct: 3.21, tier: "rare" },
    { name: "Centurion", count: 132, pct: 3.14, tier: "rare" },
    { name: "Ronin Helmet", count: 129, pct: 3.07, tier: "rare" },
    { name: "Field Cap", count: 126, pct: 3.00, tier: "rare" },
    { name: "Cap", count: 126, pct: 3.00, tier: "rare" },
    { name: "SWAT Helmet", count: 124, pct: 2.95, tier: "rare" },
    { name: "Tin Foil Hat", count: 117, pct: 2.79, tier: "rare" },
    { name: "Fedora", count: 111, pct: 2.64, tier: "rare" },
    { name: "Firefighter Helmet", count: 108, pct: 2.57, tier: "rare" },
    { name: "Pirate Hat", count: 99, pct: 2.36, tier: "rare" },
    { name: "Hard Hat", count: 94, pct: 2.24, tier: "rare" },
    { name: "Super Wojak Hat", count: 92, pct: 2.19, tier: "rare" },
    { name: "Devil Horns", count: 91, pct: 2.17, tier: "rare" },
    { name: "Cowboy Hat", count: 88, pct: 2.10, tier: "rare" },
    { name: "Beer Hat", count: 85, pct: 2.02, tier: "rare" },
    { name: "Spikes", count: 85, pct: 2.02, tier: "rare" },
    { name: "Trump Wave", count: 78, pct: 1.86, tier: "rare" },
    { name: "Comrade Hat", count: 73, pct: 1.74, tier: "rare" },
    { name: "Halo", count: 71, pct: 1.69, tier: "rare" },
    { name: "Beanie", count: 69, pct: 1.64, tier: "rare" },
    { name: "Hip Hop Hat", count: 64, pct: 1.52, tier: "rare" },
    { name: "Mermaid Waves", count: 46, pct: 1.10, tier: "rare" },
    { name: "Vixen Waves", count: 38, pct: 0.90, tier: "legendary" },
    { name: "Ponytail", count: 33, pct: 0.79, tier: "legendary" },
    { name: "Power Bob", count: 29, pct: 0.69, tier: "legendary" },
    { name: "Twin Braids", count: 29, pct: 0.69, tier: "legendary" },
    { name: "Standard Cut", count: 27, pct: 0.64, tier: "legendary" },
    { name: "2Pac Bandana", count: 24, pct: 0.57, tier: "legendary" },
    { name: "Tiara", count: 24, pct: 0.57, tier: "legendary" },
    { name: "Soy Hair", count: 21, pct: 0.50, tier: "legendary" },
    { name: "Headphones", count: 13, pct: 0.31, tier: "legendary" },
    { name: "Piccolo Turban", count: 9, pct: 0.21, tier: "legendary" }
  ],
  "Clothes": [
    { name: "Topless", count: 271, pct: 6.45, tier: "uncommon" },
    { name: "Suit", count: 236, pct: 5.62, tier: "uncommon" },
    { name: "Sports Jacket", count: 236, pct: 5.62, tier: "uncommon" },
    { name: "Chia Farmer", count: 215, pct: 5.12, tier: "uncommon" },
    { name: "Bepe Army", count: 208, pct: 4.95, tier: "rare" },
    { name: "Born to Ride", count: 205, pct: 4.88, tier: "rare" },
    { name: "Leather Jacket", count: 199, pct: 4.74, tier: "rare" },
    { name: "Wizard Drip", count: 198, pct: 4.71, tier: "rare" },
    { name: "Roman Drip", count: 194, pct: 4.62, tier: "rare" },
    { name: "Super Saiyan Uniform", count: 190, pct: 4.52, tier: "rare" },
    { name: "Ronin", count: 168, pct: 4.00, tier: "rare" },
    { name: "Ninja Turtle Fit", count: 142, pct: 3.38, tier: "rare" },
    { name: "Viking Armor", count: 129, pct: 3.07, tier: "rare" },
    { name: "SWAT Gear", count: 127, pct: 3.02, tier: "rare" },
    { name: "Bathrobe", count: 124, pct: 2.95, tier: "rare" },
    { name: "Tee", count: 116, pct: 2.76, tier: "rare" },
    { name: "Tank Top", count: 107, pct: 2.55, tier: "rare" },
    { name: "Proof of Prayer", count: 101, pct: 2.40, tier: "rare" },
    { name: "Drac", count: 97, pct: 2.31, tier: "rare" },
    { name: "Firefighter Uniform", count: 93, pct: 2.21, tier: "rare" },
    { name: "Gopher Suit", count: 88, pct: 2.10, tier: "rare" },
    { name: "Straitjacket", count: 86, pct: 2.05, tier: "rare" },
    { name: "God's Robe", count: 80, pct: 1.90, tier: "rare" },
    { name: "Pepe Suit", count: 63, pct: 1.50, tier: "rare" },
    { name: "Goose Suit", count: 59, pct: 1.40, tier: "rare" },
    { name: "Sports Bra", count: 59, pct: 1.40, tier: "rare" },
    { name: "Bepe Suit", count: 56, pct: 1.33, tier: "rare" },
    { name: "Pickle Suit", count: 50, pct: 1.19, tier: "rare" },
    { name: "Vintage Dress", count: 50, pct: 1.19, tier: "rare" },
    { name: "El Presidente", count: 49, pct: 1.17, tier: "rare" },
    { name: "Astronaut", count: 44, pct: 1.05, tier: "rare" },
    { name: "Sonic Suit", count: 43, pct: 1.02, tier: "rare" },
    { name: "Denim Vest", count: 40, pct: 0.95, tier: "legendary" },
    { name: "Prom Dress", count: 32, pct: 0.76, tier: "legendary" },
    { name: "School Uniform", count: 31, pct: 0.74, tier: "legendary" },
    { name: "Piccolo Uniform", count: 14, pct: 0.33, tier: "legendary" }
  ],
  "Background": [
    { name: "Chia Green", count: 232, pct: 5.52, tier: "uncommon" },
    { name: "$CHIA", count: 219, pct: 5.21, tier: "uncommon" },
    { name: "Sky Dive", count: 206, pct: 4.90, tier: "rare" },
    { name: "Sky Shock Blue", count: 205, pct: 4.88, tier: "rare" },
    { name: "Green Candle", count: 192, pct: 4.57, tier: "rare" },
    { name: "Neo Mint", count: 176, pct: 4.19, tier: "rare" },
    { name: "Tangerine Pop", count: 148, pct: 3.52, tier: "rare" },
    { name: "Moon", count: 148, pct: 3.52, tier: "rare" },
    { name: "Bepe Barracks", count: 145, pct: 3.45, tier: "rare" },
    { name: "Orange Grove", count: 140, pct: 3.33, tier: "rare" },
    { name: "$HOA", count: 133, pct: 3.17, tier: "rare" },
    { name: "Mellow Yellow", count: 127, pct: 3.02, tier: "rare" },
    { name: "Radioactive Forest", count: 114, pct: 2.71, tier: "rare" },
    { name: "Hell", count: 113, pct: 2.69, tier: "rare" },
    { name: "Matrix", count: 107, pct: 2.55, tier: "rare" },
    { name: "Hot Coral", count: 94, pct: 2.24, tier: "rare" },
    { name: "$LOVE", count: 90, pct: 2.14, tier: "rare" },
    { name: "Heaven", count: 89, pct: 2.12, tier: "rare" },
    { name: "Golden Hour", count: 87, pct: 2.07, tier: "rare" },
    { name: "Chia Farm", count: 87, pct: 2.07, tier: "rare" },
    { name: "$BEPE", count: 82, pct: 1.95, tier: "rare" },
    { name: "Price Down", count: 79, pct: 1.88, tier: "rare" },
    { name: "One Market", count: 79, pct: 1.88, tier: "rare" },
    { name: "Pirate Ship", count: 76, pct: 1.81, tier: "rare" },
    { name: "NYSE Pump", count: 75, pct: 1.79, tier: "rare" },
    { name: "Price Up", count: 74, pct: 1.76, tier: "rare" },
    { name: "Route 66", count: 73, pct: 1.74, tier: "rare" },
    { name: "Silicon Data Center", count: 68, pct: 1.62, tier: "rare" },
    { name: "NYSE Dump", count: 63, pct: 1.50, tier: "rare" },
    { name: "Moms Basement", count: 61, pct: 1.45, tier: "rare" },
    { name: "Spell Room", count: 59, pct: 1.40, tier: "rare" },
    { name: "Nesting Grounds", count: 54, pct: 1.29, tier: "rare" },
    { name: "$PIZZA", count: 51, pct: 1.21, tier: "rare" },
    { name: "$NECKCOIN", count: 49, pct: 1.17, tier: "rare" },
    { name: "Ronin Dojo", count: 45, pct: 1.07, tier: "rare" },
    { name: "NYSE Rug", count: 45, pct: 1.07, tier: "rare" },
    { name: "White House", count: 45, pct: 1.07, tier: "rare" },
    { name: "$CASTER", count: 43, pct: 1.02, tier: "rare" },
    { name: "Everythings Fine", count: 42, pct: 1.00, tier: "rare" },
    { name: "Rome", count: 42, pct: 1.00, tier: "rare" },
    { name: "$HONK", count: 38, pct: 0.90, tier: "legendary" },
    { name: "Morning Routine", count: 36, pct: 0.86, tier: "legendary" },
    { name: "Rainforest", count: 30, pct: 0.71, tier: "legendary" },
    { name: "Crazy Room", count: 25, pct: 0.60, tier: "legendary" },
    { name: "Signal Lost", count: 14, pct: 0.33, tier: "legendary" }
  ]
};

const tierColors = {
  legendary: { 
    bg: '#FF6600',        // Bright orange
    bgLight: '#FF9933',   // Lighter orange for gradients
    text: '#FFFFFF', 
    border: '#CC5500',    // Darker orange border for bevel effect
    label: '🟣 LEGENDARY',
    rowBackground: '#FFE0B2'  // Bright orange background for rows
  },
  rare: { 
    bg: '#4CAF50',        // Green
    bgLight: '#81C784',   // Lighter green
    text: '#FFFFFF', 
    border: '#388E3C',    // Darker green border
    label: '🔵 RARE',
    rowBackground: '#E8F5E9'  // Light green background for rows
  },
  uncommon: { 
    bg: '#FFC107',        // Yellow/Amber
    bgLight: '#FFD54F',   // Lighter yellow
    text: '#000000',      // Black text for better contrast on yellow
    border: '#F57C00',    // Darker yellow/orange border
    label: '🟢 UNCOMMON',
    rowBackground: '#FFFDE7'  // Light yellow background for rows
  },
  common: { 
    bg: '#E91E63',        // Reddish rosé/Pink
    bgLight: '#F48FB1',   // Lighter rosé
    text: '#FFFFFF', 
    border: '#C2185B',    // Darker rosé border
    label: '⚪ COMMON',
    rowBackground: '#FCE4EC'  // Light rosé background for rows
  }
};

const tierThresholds = {
  legendary: '< 1%',
  rare: '1% - 5%',
  uncommon: '5% - 15%',
  common: '> 15%'
};

const tierEmojiPairs = {
  legendary: ['🍊', '👑'],
  rare: ['💎', '🙌'],
  uncommon: ['✨', '⭐'],
  common: ['🧃', '✌️']
};

// Explicitly define category order to match desired row layout:
// Row 1: Base, Face, Mouth, Face Wear (4 tabs)
// Row 2: Head, Clothes, Background (3 tabs)
const categories = ['Base', 'Face', 'Mouth', 'Face Wear', 'Head', 'Clothes', 'Background'];

function WojakRarityExplorer({ onClose, onOpenBigPulp, onOpenBigPulpQuestionTree, hasCommentary }) {
  const [activeTab, setActiveTab] = useState('Base');
  const [hoveredTrait, setHoveredTrait] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nftId, setNftId] = useState('');
  const [selectedNft, setSelectedNft] = useState(null);
  const [showError, setShowError] = useState(false);
  const [isValidButNotIndexed, setIsValidButNotIndexed] = useState(false);
  const [nftRarityData, setNftRarityData] = useState(null);
  
  // Check if current NFT has data and commentary (for Big Pulp button visibility)
  const normalizedNftId = nftId ? String(parseInt(nftId) || 0) : null;
  const hasNftData = normalizedNftId && selectedNft;
  const hasCommentaryForCurrentNft = hasNftData && hasCommentary && hasCommentary(normalizedNftId);
  
  const handleBigPulpClick = () => {
    if (hasCommentaryForCurrentNft && onOpenBigPulp) {
      // Play orange click sound
      ensureOrangeAudioUnlocked().then(() => {
        playOrangeClickSound()
      })
      
      // Pass full NFT data to parent
      // selectedNft structure: [rank, ?, tier, Base, Face, Mouth, Face Wear, Head, Clothes, Background]
      onOpenBigPulp(normalizedNftId, selectedNft);
    }
  };

  const handleBigPulpQuestionTreeClick = () => {
    if (onOpenBigPulpQuestionTree) {
      // Play orange click sound
      ensureOrangeAudioUnlocked().then(() => {
        playOrangeClickSound()
      })
      onOpenBigPulpQuestionTree();
    }
  };
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [traitToScrollTo, setTraitToScrollTo] = useState(null);
  const scrollableRef = useRef(null);
  const parentRef = useRef(null);
  const { showToast } = useToast();
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const newIsMobile = window.innerWidth <= 640;
      setIsMobile(newIsMobile);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentData = rarityData[activeTab] || [];
  
  // Sort by count in ascending order (lowest count first, highest count last)
  const filteredData = [...currentData].sort((a, b) => a.count - b.count);

  const maxCount = Math.max(...currentData.map(d => d.count));

  const totalTraits = Object.values(rarityData).reduce((acc, arr) => acc + arr.length, 0);
  const legendaryCount = Object.values(rarityData).flat().filter(t => t.tier === 'legendary').length;


  // Load NFT rarity data on mount
  useEffect(() => {
    const loadNftData = async () => {
      try {
        const response = await fetch('/nftRarityData.json');
        if (response.ok) {
          const data = await response.json();
          setNftRarityData(data);
        }
      } catch (error) {
        console.error('Error loading NFT rarity data:', error);
      }
    };
    loadNftData();
  }, []);



  // Reset image loading state when nftId changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [nftId]);

  // Loading state when switching tabs
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Handle smooth scrolling to highlighted trait after tab change
  useEffect(() => {
    if (!traitToScrollTo) return;
    
    // Wait for DOM to update after tab change
    const scrollTimeout = setTimeout(() => {
      const highlightedElement = document.querySelector('[data-highlighted="true"]');
      
      if (highlightedElement) {
        const windowBody = highlightedElement.closest('.window-body') || 
                          document.querySelector('#rarity-explorer .window-body') ||
                          document.querySelector('.window-body.scroll-allowed');
        
        if (windowBody) {
          const currentScrollTop = windowBody.scrollTop;
          const containerRect = windowBody.getBoundingClientRect();
          const elementRect = highlightedElement.getBoundingClientRect();
          
          // Verify element has valid dimensions
          if (elementRect.height > 0 && elementRect.width > 0) {
            const elementTopRelativeToContainer = elementRect.top - containerRect.top + currentScrollTop;
            const containerHeight = windowBody.clientHeight;
            const elementHeight = elementRect.height;
            
            const targetScrollTop = elementTopRelativeToContainer - (containerHeight / 2) + (elementHeight / 2) - 20;
            const maxScroll = windowBody.scrollHeight - containerHeight;
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));
            
            if (Math.abs(finalScrollTop - currentScrollTop) > 5) {
              smoothScrollTo(windowBody, finalScrollTop, 500);
            }
          }
        }
      }
      
      // Clear the scroll target after scrolling
      setTraitToScrollTo(null);
    }, 100);
    
    return () => clearTimeout(scrollTimeout);
  }, [activeTab, traitToScrollTo]);


  // Helper to get tier info from letter
  const getTierFromLetter = (letter) => {
    const tiers = {
      'l': { name: 'legendary', color: '#FF6600', label: '🟣 LEGENDARY' },
      'r': { name: 'rare', color: '#4CAF50', label: '🔵 RARE' },
      'u': { name: 'uncommon', color: '#FFC107', label: '🟢 UNCOMMON' },
      'c': { name: 'common', color: '#E91E63', label: '⚪ COMMON' }
    };
    return tiers[letter] || tiers['c'];
  };

  // Helper to compute overall tier from topPercent
  const getOverallTierFromTopPercent = (topPercent) => {
    if (topPercent < 1) return 'legendary';
    if (topPercent < 5) return 'rare';
    if (topPercent < 15) return 'uncommon';
    return 'common';
  };

  // Get display tier and emoji based on NFT's global rank (1-4200) - Top-Heavy distribution
  const getDisplayTierFromRank = (rank) => {
    if (rank <= 420) {
      return { tier: 'legendary', emoji: '🍊👑' }; // Top 10% - LEGENDARY
    } else if (rank <= 1260) {
      return { tier: 'rare', emoji: '💎🙌' }; // Next 20% - RARE
    } else if (rank <= 2520) {
      return { tier: 'uncommon', emoji: '✨⭐' }; // Next 30% - UNCOMMON
    } else {
      return { tier: 'common', emoji: '🧃✌️' }; // Bottom 40% - COMMON
    }
  };

  // Get display tier emojis based on rarity RANK (Top-Heavy distribution)
  const getDisplayTierEmojis = (rank) => {
    return getDisplayTierFromRank(rank).emoji;
  };

  // Format percentage: always show one decimal place
  const formatPercentage = (pct) => {
    return pct.toFixed(1);
  };

  // Helper to render emoji badge row
  const renderEmojiRow = (tier) => {
    const emojiPair = tierEmojiPairs[tier] || tierEmojiPairs.common;
    const [emojiA, emojiB] = emojiPair;
    const tierName = tier.toUpperCase();

    const handleEmojiClick = (emoji) => {
      showToast(`${tierName} ${emojiA}${emojiB}`, 'info', 2000);
    };

    return (
      <div className="rarityEmojiRow" aria-label={`Tier ${tier}`}>
        <button
          type="button"
          className="rarityEmojiBox rarityEmojiBox--a"
          title={`${tierName} ${emojiA}${emojiB}`}
          aria-label={`${tierName} ${emojiA}`}
          onClick={() => handleEmojiClick(emojiA)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span>{emojiA}</span>
        </button>
        <button
          type="button"
          className="rarityEmojiBox rarityEmojiBox--b"
          title={`${tierName} ${emojiA}${emojiB}`}
          aria-label={`${tierName} ${emojiB}`}
          onClick={() => handleEmojiClick(emojiB)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span>{emojiB}</span>
        </button>
      </div>
    );
  };

  const handleSearchWithId = (id) => {
    if (!nftRarityData || !id) {
      setSelectedNft(null);
      setShowError(false);
      setIsValidButNotIndexed(false);
      return;
    }
    
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId < 1 || numericId > 4200) {
      setSelectedNft(null);
      setShowError(true);
      setIsValidButNotIndexed(false);
      return;
    }
    
    const rarityInfo = nftRarityData[String(numericId)];
    if (rarityInfo && Array.isArray(rarityInfo) && rarityInfo.length >= 10) {
      setSelectedNft(rarityInfo);
      setShowError(false);
      setIsValidButNotIndexed(false);
    } else {
      // Valid ID but not in the data (not in top 420)
      setSelectedNft(null);
      setShowError(false);
      setIsValidButNotIndexed(true);
    }
  };

  const handleNftIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setNftId(value);
    
    if (value.length === 0) {
      // Clear the preview when input is empty
      setSelectedNft(null);
      setShowError(false);
      setIsValidButNotIndexed(false);
    } else if (value.length === 4) {
      setTimeout(() => handleSearchWithId(value), 100);
    }
  };

  const handleNftIdKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear();
    } else if (e.key === 'ArrowUp' && nftId) {
      e.preventDefault();
      const newId = Math.min(4200, parseInt(nftId || '0', 10) + 1);
      setNftId(String(newId));
      setTimeout(() => handleSearchWithId(String(newId)), 50);
    } else if (e.key === 'ArrowDown' && nftId) {
      e.preventDefault();
      const newId = Math.max(1, parseInt(nftId || '2', 10) - 1);
      setNftId(String(newId));
      setTimeout(() => handleSearchWithId(String(newId)), 50);
    }
  };

  const handleSearch = () => {
    if (!nftId) {
      handleClear();
      return;
    }
    handleSearchWithId(nftId);
  };

  const handleClear = () => {
    setNftId('');
    setSelectedNft(null);
    setShowError(false);
    setIsValidButNotIndexed(false);
  };

  // Emit NFT selection for Big Pulp Intelligence
  useEffect(() => {
    if (!nftId || !selectedNft) return;
    
    window.dispatchEvent(new CustomEvent('nftSelected', {
      detail: { nftId: String(nftId) }
    }));
  }, [nftId, selectedNft]);

  // Listen for navigateToNft event from Big Pulp Intelligence
  useEffect(() => {
    if (!nftRarityData) return;
    
    const handleNavigateToNft = (event) => {
      const { nftId } = event.detail;
      if (nftId) {
        setNftId(nftId);
        setTimeout(() => {
          if (!nftRarityData) return;
          const numericId = parseInt(nftId, 10);
          if (isNaN(numericId) || numericId < 1 || numericId > 4200) {
            setSelectedNft(null);
            setShowError(true);
            setIsValidButNotIndexed(false);
            return;
          }
          const rarityInfo = nftRarityData[String(numericId)];
          if (rarityInfo && Array.isArray(rarityInfo) && rarityInfo.length >= 10) {
            setSelectedNft(rarityInfo);
            setShowError(false);
            setIsValidButNotIndexed(false);
          } else {
            setSelectedNft(null);
            setShowError(false);
            setIsValidButNotIndexed(true);
          }
        }, 100);
      }
    };

    window.addEventListener('navigateToNft', handleNavigateToNft);
    return () => {
      window.removeEventListener('navigateToNft', handleNavigateToNft);
    };
  }, [nftRarityData]);

  // Modern easing function for smooth scroll animation
  const easeOutCubic = (t) => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Store active animation frame ID to cancel if needed
  let activeScrollAnimation = null;

  const smoothScrollTo = (element, targetPosition, duration = 500) => {
    // Cancel any existing scroll animation
    if (activeScrollAnimation !== null) {
      cancelAnimationFrame(activeScrollAnimation);
      activeScrollAnimation = null;
    }

    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    
    // If distance is very small, just set it directly
    if (Math.abs(distance) < 1) {
      element.scrollTop = targetPosition;
      return;
    }

    let startTime = null;

    const animateScroll = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Apply easing function for smooth acceleration/deceleration
      const easedProgress = easeOutCubic(progress);
      const currentPosition = startPosition + (distance * easedProgress);
      
      element.scrollTop = currentPosition;
      
      if (progress < 1) {
        activeScrollAnimation = requestAnimationFrame(animateScroll);
      } else {
        activeScrollAnimation = null;
      }
    };

    activeScrollAnimation = requestAnimationFrame(animateScroll);
  };

  const scrollToHighlightedTrait = (traitValue) => {
    // Wait for React to re-render after state update
    // Use double requestAnimationFrame + small delay to ensure DOM is updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Small delay to ensure React has fully updated the DOM
        setTimeout(() => {
          // Function to attempt scrolling with modern smooth animation
          const attemptScroll = (attempt = 0) => {
            if (attempt > 15) return; // Max 15 attempts
            
            // Try to find the highlighted element
            const highlightedElement = document.querySelector('[data-highlighted="true"]');
            
            if (highlightedElement) {
              // Find the actual scrollable container (window-body)
              const windowBody = highlightedElement.closest('.window-body') || 
                                document.querySelector('#rarity-explorer .window-body') ||
                                document.querySelector('.window-body.scroll-allowed');
              
              if (windowBody) {
                // Get current scroll position of window-body
                const currentScrollTop = windowBody.scrollTop;
                
                // Get positions using getBoundingClientRect
                const containerRect = windowBody.getBoundingClientRect();
                const elementRect = highlightedElement.getBoundingClientRect();
                
                // Verify element is actually visible and has valid dimensions
                if (elementRect.height === 0 || elementRect.width === 0) {
                  if (attempt < 15) {
                    requestAnimationFrame(() => attemptScroll(attempt + 1));
                  }
                  return;
                }
                
                // Calculate the element's position relative to the window-body's scroll position
                const elementTopRelativeToContainer = elementRect.top - containerRect.top + currentScrollTop;
                const containerHeight = windowBody.clientHeight;
                const elementHeight = elementRect.height;
                
                // Calculate target scroll position to center the element in the viewport
                const targetScrollTop = elementTopRelativeToContainer - (containerHeight / 2) + (elementHeight / 2) - 20;
                
                // Ensure we don't scroll past the boundaries
                const maxScroll = windowBody.scrollHeight - containerHeight;
                const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));
                
                // Only scroll if there's actually a meaningful distance to travel
                if (Math.abs(finalScrollTop - currentScrollTop) > 5) {
                  // Use custom smooth scroll with modern easing
                  smoothScrollTo(windowBody, finalScrollTop, 500);
                }
              }
            } else if (attempt < 15) {
              // If element not found, try again on next frame
              requestAnimationFrame(() => attemptScroll(attempt + 1));
            }
          };
          
          // Start attempting to scroll
          attemptScroll();
        }, 50); // Small delay to ensure DOM is fully updated
      });
    });
  };

  const getRowStyle = (trait, idx) => {
    const isHighlighted = selectedNft && (
      (activeTab === 'Base' && trait.name === selectedNft[3]) ||
      (activeTab === 'Face' && trait.name === selectedNft[4]) ||
      (activeTab === 'Mouth' && trait.name === selectedNft[5]) ||
      (activeTab === 'Face Wear' && trait.name === selectedNft[6]) ||
      (activeTab === 'Head' && trait.name === selectedNft[7]) ||
      (activeTab === 'Clothes' && trait.name === selectedNft[8]) ||
      (activeTab === 'Background' && trait.name === selectedNft[9])
    );
    
    if (isHighlighted) {
      return {
        background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.15), rgba(150, 100, 255, 0.15), rgba(100, 200, 255, 0.15))',
        border: '2px solid rgba(100, 150, 255, 0.6)',
        boxShadow: '0 0 8px 2px rgba(100, 150, 255, 0.3), inset 0 0 12px rgba(100, 200, 255, 0.1)',
        transform: 'scale(1.01)',
        position: 'relative',
        zIndex: 1
      };
    }
    
    if (hoveredTrait === trait.name) {
      return {
        background: 'var(--surface-3, #e0e0ff)',
        border: '1px solid var(--title-active-bg, #000080)'
      };
    }
    
    // Use tier-specific background colors for better visual distinction
    const tierBg = tierColors[trait.tier]?.rowBackground || 'var(--inset-face, #ffffff)';
    
    return {
      background: tierBg,
      border: '1px solid transparent'
    };
  };

  return (
    <div
      className="wojak-rarity-explorer-root"
      style={{
        fontFamily: '"MS Sans Serif", "Segoe UI", Tahoma, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
    >
      {/* Header Stats - Fixed */}
      {isMobile ? (
        /* Mobile: Compact single-row header */
        <div 
          className="rarity-explorer-mobile"
          style={{
            background: 'var(--surface-3, #ffffcc)',
            padding: '8px 12px',
            borderBottom: '2px solid',
            borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img 
              src="/assets/logo.png" 
              alt="Wojak Ink" 
              className="rarity-explorer-logo"
              style={{ 
                width: '32px', 
                height: '32px',
                imageRendering: 'pixelated',
                objectFit: 'contain'
              }}
              onError={(e) => {
                // Fallback to favicon.ico if logo.png doesn't exist
                e.target.src = '/assets/favicon.ico';
              }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-1, #000000)' }}>Wojak Farmers Plot</span>
            <button
              onClick={handleBigPulpQuestionTreeClick}
              onPointerDown={(e) => e.stopPropagation()}
              title="Hang with Big Pulp"
              style={{
                background: 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)',
                border: '2px outset #ffcc88',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '10px',
                padding: '3px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textShadow: '1px 1px 0 #995500',
                fontFamily: "'MS Sans Serif', sans-serif",
                flexShrink: 0,
                marginLeft: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #ffbb55 0%, #ff9922 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.currentTarget.style.borderStyle = 'inset';
                e.currentTarget.style.background = 'linear-gradient(180deg, #ff8800 0%, #ff6600 100%)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.borderStyle = 'outset';
                e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
              }}
            >
              Hang with Big Pulp 🍊
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px'
          }}>
            {hasNftData && (
              <button
                onClick={handleBigPulpClick}
                disabled={!hasCommentaryForCurrentNft}
                onPointerDown={(e) => e.stopPropagation()}
                title={hasCommentaryForCurrentNft ? "Get Big Pulp's take on this NFT" : "No commentary available for this NFT"}
                style={{
                  background: hasCommentaryForCurrentNft 
                    ? 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)' 
                    : 'linear-gradient(180deg, #808080 0%, #606060 100%)',
                  border: '2px outset #ffcc88',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  padding: '3px 8px',
                  cursor: hasCommentaryForCurrentNft ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                  textShadow: '1px 1px 0 #995500',
                  fontFamily: "'MS Sans Serif', sans-serif",
                  flexShrink: 0,
                  opacity: hasCommentaryForCurrentNft ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ffbb55 0%, #ff9922 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
                  }
                }}
                onMouseDown={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.stopPropagation();
                    e.currentTarget.style.borderStyle = 'inset';
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ff8800 0%, #ff6600 100%)';
                  }
                }}
                onMouseUp={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.currentTarget.style.borderStyle = 'outset';
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
                  }
                }}
              >
                Ask Big Pulp 🍊
              </button>
            )}
            <span style={{ 
              color: 'var(--text-1, #000000)', 
              fontFamily: 'monospace', 
              fontSize: '10px',
              whiteSpace: 'nowrap'
            }}>
              NFT ID:
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              autoComplete="off"
              value={nftId}
              onChange={handleNftIdChange}
              onKeyDown={handleNftIdKeyDown}
              placeholder="0001"
              maxLength={4}
              style={{
                width: '50px',
                padding: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '2px inset var(--border-dark)',
                background: 'var(--inset-face, #ffffff)',
                color: 'var(--text-1, #000000)',
                textAlign: 'center',
                minWidth: '36px',
                minHeight: '36px'
              }}
            />
          </div>
        </div>
      ) : (
        /* Desktop: Original header layout */
        <div style={{
          background: 'var(--surface-3, #ffffcc)',
          padding: '12px 16px',
          borderBottom: '2px solid',
          borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <img 
              src="/assets/logo.png" 
              alt="Wojak Ink" 
              className="rarity-explorer-logo"
              style={{ 
                width: '40px', 
                height: '40px',
                imageRendering: 'pixelated',
                objectFit: 'contain'
              }}
              onError={(e) => {
                // Fallback to favicon.ico if logo.png doesn't exist
                e.target.src = '/assets/favicon.ico';
              }}
            />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-1, #000000)' }}>Wojak Farmers Plot</div>
            </div>
            <button
              onClick={handleBigPulpQuestionTreeClick}
              onPointerDown={(e) => e.stopPropagation()}
              title="Hang with Big Pulp"
              style={{
                background: 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)',
                border: '2px outset #ffcc88',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '11px',
                padding: '4px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textShadow: '1px 1px 0 #995500',
                fontFamily: "'MS Sans Serif', sans-serif",
                flexShrink: 0,
                marginLeft: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #ffbb55 0%, #ff9922 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.currentTarget.style.borderStyle = 'inset';
                e.currentTarget.style.background = 'linear-gradient(180deg, #ff8800 0%, #ff6600 100%)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.borderStyle = 'outset';
                e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
              }}
            >
              Hang with Big Pulp 🍊
            </button>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: 'var(--title-active-bg, #000080)',
            padding: '6px 10px',
            border: '2px solid',
            borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)'
          }}>
            {hasNftData && (
              <button
                onClick={handleBigPulpClick}
                disabled={!hasCommentaryForCurrentNft}
                onPointerDown={(e) => e.stopPropagation()}
                title={hasCommentaryForCurrentNft ? "Get Big Pulp's take on this NFT" : "No commentary available for this NFT"}
                style={{
                  background: hasCommentaryForCurrentNft 
                    ? 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)' 
                    : 'linear-gradient(180deg, #808080 0%, #606060 100%)',
                  border: '2px outset #ffcc88',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  padding: '4px 10px',
                  cursor: hasCommentaryForCurrentNft ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                  textShadow: '1px 1px 0 #995500',
                  fontFamily: "'MS Sans Serif', sans-serif",
                  flexShrink: 0,
                  opacity: hasCommentaryForCurrentNft ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ffbb55 0%, #ff9922 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
                  }
                }}
                onMouseDown={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.stopPropagation();
                    e.currentTarget.style.borderStyle = 'inset';
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ff8800 0%, #ff6600 100%)';
                  }
                }}
                onMouseUp={(e) => {
                  if (hasCommentaryForCurrentNft) {
                    e.currentTarget.style.borderStyle = 'outset';
                    e.currentTarget.style.background = 'linear-gradient(180deg, #ffaa44 0%, #ff8800 100%)';
                  }
                }}
              >
                Ask Big Pulp 🍊
              </button>
            )}
            <span style={{ 
              color: 'var(--title-active-text, #00ff00)', 
              fontFamily: 'monospace', 
              fontSize: '11px',
              whiteSpace: 'nowrap'
            }}>
              NFT ID:
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              autoComplete="off"
              value={nftId}
              onChange={handleNftIdChange}
              onKeyDown={handleNftIdKeyDown}
              placeholder="0001"
              maxLength={4}
              style={{
                width: '55px',
                padding: '3px 6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                border: '2px inset var(--border-dark)',
                background: 'var(--inset-face, #ffffff)',
                color: 'var(--text-1, #000000)',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
      )}

      {/* Not Indexed Message Panel - Fixed when visible */}
      {isValidButNotIndexed && nftId && (
        <div 
          id="nft-not-indexed-panel"
          style={{
            margin: '8px',
            border: '2px solid',
            borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
            background: 'var(--surface-1, #c0c0c0)',
            flexShrink: 0,
            width: isMobile ? 'calc(100% - 16px)' : 'auto',
            maxWidth: isMobile ? 'calc(100% - 16px)' : 'none',
            boxSizing: 'border-box',
            opacity: 0.6
          }}
          onMouseDown={(e) => {
            // Prevent window dragging when clicking inside panel
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Panel Title Bar */}
          <div style={{
            background: 'linear-gradient(90deg, #808080, #a0a0a0)',
            padding: '4px 8px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#000000' }}>NFT #{String(parseInt(nftId) || 0).padStart(4, '0')}</span>
          </div>
          
          {/* Panel Content */}
          <div 
            style={{
              padding: isMobile ? '16px 12px' : '20px 16px',
              background: 'var(--inset-face, #ffffff)',
              border: '2px solid',
              borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
              margin: isMobile ? '3px' : '4px',
              textAlign: 'center',
              color: 'var(--text-2, #888)'
            }}
          >
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: 'var(--text-2, #666)'
            }}>
              Currently, only the top 10% is indexed
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-2, #888)'
            }}>
              This NFT is not in the top 420 pieces (top 10%)
            </div>
          </div>
        </div>
      )}

      {/* NFT Details Panel - Fixed when visible */}
      {selectedNft && (
        <div 
          id="nft-details-panel"
          style={{
            margin: '8px',
            border: '2px solid',
            borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
            background: 'var(--surface-1, #c0c0c0)',
            flexShrink: 0,
            width: isMobile ? 'calc(100% - 16px)' : 'auto',
            maxWidth: isMobile ? 'calc(100% - 16px)' : 'none',
            boxSizing: 'border-box'
          }}
          onMouseDown={(e) => {
            // Prevent window dragging when clicking inside NFT details panel
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {/* Panel Title Bar */}
          <div style={{
            background: 'linear-gradient(90deg, var(--title-active-bg, #000080), var(--dialog-blue-light, #1084d0))',
            padding: '4px 8px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span style={{ color: '#000000' }}>{selectedNft[3] || 'Unknown'} #{String(parseInt(nftId) || 0).padStart(4, '0')}</span>
              {!isMobile && (
                <span style={{
                  fontSize: '10px',
                  color: 'var(--text-2, #888)',
                  fontStyle: 'italic',
                  fontWeight: 'normal'
                }}>
                  💡 Click any trait to jump to that category
                </span>
              )}
            </div>
            <span style={{
              background: selectedNft[2] ? getTierFromLetter(selectedNft[2]).color : '#808080',
              padding: '2px 8px',
              fontSize: '10px',
              textTransform: 'uppercase'
            }}>
              {selectedNft[2] ? getTierFromLetter(selectedNft[2]).name : 'common'}
            </span>
          </div>
          
          {/* Panel Content */}
          <div 
            className="rarity-explorer-panel-content"
            style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '9px' : '12px',
            padding: isMobile ? '9px 6px 9px 9px' : '12px',
            background: 'var(--inset-face, #ffffff)',
            border: '2px solid',
            borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
            margin: isMobile ? '3px' : '4px',
            overflow: 'visible',
            position: 'relative',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            
            {isMobile ? (
              <>
                {/* Mobile: Left Column: NFT Preview */}
                <div 
                  className="rarity-explorer-preview-container"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: '9px',
                    flexShrink: 0,
                    overflow: 'visible',
                    position: 'relative'
                  }}
                >
                  {/* Preview Image Box - Square, same size as stats box */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    border: '2px solid',
                    borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0,
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}>
                    {!imageLoaded && !imageError && (
                      <div style={{ 
                        position: 'absolute', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#888',
                        zIndex: 1
                      }}>
                        Loading...
                      </div>
                    )}
                    {imageError && (
                      <div style={{ fontSize: '24px', zIndex: 1 }}>🖼️❌</div>
                    )}
                    <img 
                      src={`https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${String(parseInt(nftId)).padStart(4, '0')}.png`}
                      alt={`Wojak #${nftId}`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                      style={{
                        width: '100%',
                        height: '100%',
                        imageRendering: 'pixelated',
                        objectFit: 'cover',
                        opacity: imageLoaded ? 1 : 0,
                        transition: 'opacity 0.2s',
                        display: 'block'
                      }}
                    />
                  </div>
                  
                  {/* Stats Box Container - Wraps box and emojis */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0
                  }}>
                    {/* Stats Box - Square, same size as preview (like desktop) */}
                    <div className="re-stats-box" style={{
                      width: '80px',
                      height: '80px',
                      border: '2px inset',
                      borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                      background: selectedNft[2] ? getTierFromLetter(selectedNft[2]).color : '#808080',
                      padding: '6px',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                      gap: '4px'
                    }}>
                      {/* Rank Line - Number only */}
                      <div className="re-rank-line" style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        lineHeight: '1.1',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'center',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {selectedNft[0] ? `#${selectedNft[0].toLocaleString()}` : 'N/A'}
                      </div>
                      
                      {/* Sub Line - "of 4200 NFTs" */}
                      <div className="re-sub-line" style={{
                        fontSize: '8px',
                        opacity: 0.9,
                        lineHeight: '1.1',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        of {(4200).toLocaleString()} NFTs
                      </div>
                      
                      {/* Top percentage row */}
                      <div className="re-stats-bottom-row" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px',
                        width: '100%',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}>
                        <div>Top {selectedNft[0] ? ((selectedNft[0] / 4200) * 100).toFixed(1) : '0.0'}%</div>
                      </div>
                    </div>
                    
                    {/* Badge Row - Emojis on the right side of the box */}
                    <div className="re-badge-row" style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '3px',
                      flexShrink: 0
                    }}>
                      {selectedNft[0] ? renderEmojiRow(getDisplayTierFromRank(selectedNft[0]).tier) : null}
                    </div>
                  </div>
                </div>
                
                {/* Mobile: Right Column: Traits Table */}
                <div style={{ 
                  width: '100%',
                  maxWidth: '100%',
                  overflowX: 'auto',
                  overflowY: 'visible',
                  display: 'block',
                  boxSizing: 'border-box',
                  margin: 0,
                  padding: '0 2px'
                }}>
                  <table
                    className="rarity-explorer-traits-table"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: '100%',
                      borderCollapse: 'collapse',
                      borderSpacing: 0,
                      fontSize: '11px',
                      tableLayout: 'fixed',
                      boxSizing: 'border-box',
                      margin: 0,
                      padding: 0
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <thead>
                      <tr style={{ background: 'var(--surface-3)' }}>
                        <th style={{ padding: '4px 4px 4px 6px', textAlign: 'left', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: '11px', width: '18%', boxSizing: 'border-box', overflow: 'hidden' }}>Trait</th>
                        <th style={{ padding: '4px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: '11px', width: '20%', boxSizing: 'border-box', overflow: 'hidden' }}>Value</th>
                        <th style={{ padding: '4px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: '11px', width: '28%', boxSizing: 'border-box', overflow: 'hidden' }}>Rarity</th>
                        <th style={{ padding: '4px 4px', textAlign: 'right', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: '11px', width: '12%', boxSizing: 'border-box', overflow: 'hidden' }}>%</th>
                        <th className="trait-count-column" style={{ padding: '4px 8px 4px 4px', textAlign: 'right', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: '11px', width: '22%', boxSizing: 'border-box', overflow: 'hidden' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'Base', idx: 3 },
                        { key: 'Face', idx: 4 },
                        { key: 'Mouth', idx: 5 },
                        { key: 'Face Wear', idx: 6 },
                        { key: 'Head', idx: 7 },
                        { key: 'Clothes', idx: 8 },
                        { key: 'Background', idx: 9 },
                      ].map(({ key, idx }, rowIdx) => {
                        const value = selectedNft[idx] || '';
                        const traitData = rarityData[key]?.find(t => t.name === value);
                        const tier = getTraitTier(value, key);
                        const pct = traitData?.pct || 0;
                        const count = traitData?.count || 0;
                        return (
                          <tr
                            key={key}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setActiveTab(key);
                              setTraitToScrollTo(value);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                            }}
                            style={{
                              cursor: 'pointer',
                              background: rowIdx % 2 === 0 ? 'transparent' : 'var(--surface-1, #f8f8f8)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--surface-2, #f0f0f0)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = rowIdx % 2 === 0 ? 'transparent' : 'var(--surface-1, #f8f8f8)';
                            }}
                            title={`Click to view all ${key} traits`}
                          >
                            <td className="trait-col" style={{ 
                              padding: '4px 4px 4px 6px', 
                              color: 'var(--text-2, #666)',
                              borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '11px',
                              boxSizing: 'border-box',
                              minWidth: 0
                            }}>
                              {key}
                            </td>
                            <td className="value-col" style={{ 
                              padding: '4px 4px', 
                              fontWeight: tier === 'legendary' ? 'bold' : 'normal',
                              color: tier === 'legendary' ? '#FF6600' : 'var(--text-1, #000000)',
                              borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '11px',
                              boxSizing: 'border-box',
                              minWidth: 0
                            }}>
                              {value}
                            </td>
                            <td className="rarity-col" style={{ 
                              padding: '4px 4px', 
                              textAlign: 'center',
                              borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                              fontSize: '11px',
                              boxSizing: 'border-box',
                              minWidth: 0
                            }}>
                              <span 
                                className={tier === 'legendary' ? 'legendary-tier-badge' : ''}
                                style={{
                                display: 'inline-block',
                                padding: '1px 4px',
                                width: '70px',
                                background: tierColors[tier]?.bg || '#808080',
                                color: tierColors[tier]?.text || '#000000',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                boxSizing: 'border-box'
                              }}>
                                {tier.toUpperCase()}
                              </span>
                            </td>
                            <td className="percent-col" style={{ 
                              padding: '4px 4px', 
                              textAlign: 'right',
                              fontFamily: 'monospace',
                              fontSize: '10px',
                              borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                              fontVariantNumeric: 'tabular-nums',
                              boxSizing: 'border-box',
                              minWidth: 0
                            }}>
                              {formatPercentage(pct)}%
                            </td>
                            <td className="count-col" style={{ 
                              padding: '4px 8px 4px 4px', 
                              textAlign: 'right',
                              borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                              fontFamily: 'monospace',
                              fontSize: '10px',
                              fontVariantNumeric: 'tabular-nums',
                              boxSizing: 'border-box',
                              minWidth: 0
                            }}>
                              {count.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  <div style={{
                    marginTop: '8px',
                    fontSize: '10px',
                    color: 'var(--text-2, #888)',
                    fontStyle: 'italic',
                    flexShrink: 0
                  }}>
                    💡 Click any trait to jump to that category
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Desktop: Left Rail - Two square boxes side by side */}
                <div className="re-leftRail" style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '8px',
                  alignItems: 'stretch'
                }}>
                  {/* Preview Box - Square */}
                  <div className="re-preview-box" style={{
                    border: '2px solid',
                    borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    flexShrink: 0
                  }}>
                    {!imageLoaded && !imageError && (
                      <div style={{ 
                        position: 'absolute', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#888',
                        zIndex: 1
                      }}>
                        Loading...
                      </div>
                    )}
                    {imageError && (
                      <div style={{ fontSize: '24px', zIndex: 1 }}>🖼️❌</div>
                    )}
                    <img 
                      src={`https://bafybeigjkkonjzwwpopo4wn4gwrrvb7z3nwr2edj2554vx3avc5ietfjwq.ipfs.w3s.link/${String(parseInt(nftId)).padStart(4, '0')}.png`}
                      alt={`Wojak #${nftId}`}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                      style={{
                        width: '100%',
                        height: '100%',
                        imageRendering: 'pixelated',
                        objectFit: 'cover',
                        opacity: imageLoaded ? 1 : 0,
                        transition: 'opacity 0.2s',
                        display: 'block'
                      }}
                    />
                  </div>
                  
                  {/* Stats Box - Square, same size as preview */}
                  <div className="re-stats-box" style={{
                    border: '2px inset',
                    borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
                    background: selectedNft[2] ? getTierFromLetter(selectedNft[2]).color : '#808080',
                    padding: '10px',
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    gap: '6px'
                  }}>
                    {/* Badge Row - Emojis above rank */}
                    <div className="re-badge-row" style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '2px'
                    }}>
                      {selectedNft[0] ? renderEmojiRow(getDisplayTierFromRank(selectedNft[0]).tier) : null}
                    </div>
                    
                    {/* Rank Line - Number only */}
                    <div className="re-rank-line" style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      lineHeight: '1.1',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'center',
                      width: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {selectedNft[0] ? `#${selectedNft[0].toLocaleString()}` : 'N/A'}
                    </div>
                    
                    {/* Sub Line - "of 4200 NFTs" */}
                    <div className="re-sub-line" style={{
                      fontSize: '10px',
                      opacity: 0.9,
                      lineHeight: '1.1',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      of {((4200).toLocaleString())} NFTs
                    </div>
                    
                    {/* Top percentage row */}
                    <div className="re-stats-bottom-row" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      width: '100%',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      textAlign: 'center'
                    }}>
                      <div>Top {selectedNft[0] ? ((selectedNft[0] / 4200) * 100).toFixed(1) : '0.0'}%</div>
                    </div>
                  </div>
                </div>
                
                {/* Desktop: Right Table - Takes remaining width */}
                <div className="re-rightTable" style={{ 
                  flex: 1, 
                  minWidth: 0, 
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}>
                  <table 
                    className="rarity-explorer-traits-table"
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '12px',
                      tableLayout: 'auto'
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                <thead>
                  <tr style={{ background: 'var(--surface-3)' }}>
                    <th style={{ padding: isMobile ? '4px 6px' : '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: isMobile ? '11px' : '12px' }}>Trait</th>
                    <th style={{ padding: isMobile ? '4px 6px' : '3px 4px', textAlign: 'left', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: isMobile ? '11px' : '12px' }}>Value</th>
                    <th style={{ padding: isMobile ? '4px 6px' : '3px 4px', textAlign: 'center', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: isMobile ? '11px' : '12px' }}>Rarity</th>
                    <th style={{ padding: isMobile ? '4px 6px' : '3px 4px', textAlign: 'right', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: isMobile ? '11px' : '12px' }}>%</th>
                    <th className="trait-count-column" style={{ padding: isMobile ? '4px 6px' : '3px 4px', textAlign: 'right', borderBottom: '1px solid var(--border-dark)', color: 'var(--text-1, #000000)', fontSize: isMobile ? '11px' : '12px' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'Base', idx: 3 },
                    { key: 'Face', idx: 4 },
                    { key: 'Mouth', idx: 5 },
                    { key: 'Face Wear', idx: 6 },
                    { key: 'Head', idx: 7 },
                    { key: 'Clothes', idx: 8 },
                    { key: 'Background', idx: 9 },
                  ].map(({ key, idx }, rowIdx) => {
                    const value = selectedNft?.[idx] || '';
                    const traitData = rarityData[key]?.find(t => t.name === value);
                    const tier = getTraitTier(value, key);
                    const pct = traitData?.pct || 0;
                    const count = traitData?.count || 0;
                    
                    return (
                      <tr 
                        key={key}
                        style={{ 
                          background: rowIdx % 2 === 0 ? 'var(--inset-face, #ffffff)' : 'var(--surface-2, #f8f8f8)',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setActiveTab(key);
                          // Start scrolling immediately - no delay
                          scrollToHighlightedTrait(value);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        title={`Click to view all ${key} traits`}
                      >
                        <td className="trait-col" style={{ 
                          padding: isMobile ? '4px 6px' : '3px 4px', 
                          color: 'var(--text-2, #666)',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: isMobile ? '11px' : '12px'
                        }}>
                          {key}
                        </td>
                        <td className="value-col" style={{ 
                          padding: isMobile ? '4px 6px' : '3px 4px', 
                          fontWeight: tier === 'legendary' ? 'bold' : 'normal',
                          color: tier === 'legendary' ? '#FF6600' : 'var(--text-1, #000000)',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: isMobile ? '11px' : '12px'
                        }}>
                          {value}
                        </td>
                        <td className="rarity-col" style={{ 
                          padding: isMobile ? '4px 6px' : '3px 4px', 
                          textAlign: 'center',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                          fontSize: isMobile ? '11px' : '10px'
                        }}>
                          <span 
                            className={tier === 'legendary' ? 'legendary-tier-badge' : ''}
                            style={{
                            display: 'inline-block',
                            padding: '1px 4px',
                            width: isMobile ? '70px' : '70px',
                            background: tierColors[tier]?.bg || '#808080',
                            color: tierColors[tier]?.text || '#000000',
                            fontSize: isMobile ? '9px' : '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                          }}>
                            {tier.toUpperCase()}
                          </span>
                        </td>
                        <td className="percent-col" style={{ 
                          padding: isMobile ? '4px 6px' : '3px 4px', 
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: isMobile ? '10px' : '12px',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)',
                          color: 'var(--text-1, #000000)'
                        }}>
                          {formatPercentage(pct)}%
                        </td>
                        <td className="trait-count-column" style={{ 
                          padding: isMobile ? '4px 6px' : '3px 4px', 
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: isMobile ? '10px' : '12px',
                          color: 'var(--text-2, #888)',
                          borderBottom: '1px solid var(--border-mid, #e0e0e0)'
                        }}>
                          {count.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                  </table>
                </div>
              </>
            )}
            
          </div>
        </div>
      )}

      {/* Category Tabs - Fixed */}
      <div 
        className="category-tabs-scrollable"
        style={{
          display: 'flex',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          overflowX: isMobile ? 'auto' : 'visible',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: isMobile ? 'none' : 'auto',
          msOverflowStyle: isMobile ? 'none' : 'auto',
          padding: '8px 8px 0 8px',
          gap: isMobile ? '4px' : '2px',
          flexShrink: 0,
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {categories.map((cat, index) => {
          // Calculate flex-basis for desktop only (mobile uses flexShrink: 0)
          let flexBasis;
          if (!isMobile) {
            // Desktop: All tabs equal size
            // calc((100% - 16px padding - 12px gaps) / 7)
            flexBasis = 'calc((100% - 28px) / 7)';
          }

          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                padding: isMobile ? '6px 10px' : '6px 12px',
                fontSize: isMobile ? '11px' : '12px',
                background: activeTab === cat ? 'var(--surface-1, #c0c0c0)' : 'var(--surface-2, #a0a0a0)',
                border: '2px solid',
                borderColor: activeTab === cat 
                  ? 'var(--border-light) var(--border-dark) var(--surface-1) var(--border-light)' 
                  : 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
                borderBottom: activeTab === cat ? 'none' : `2px solid var(--border-dark)`,
                marginBottom: activeTab === cat ? '-2px' : '0',
                cursor: 'pointer',
                fontWeight: activeTab === cat ? 'bold' : 'normal',
                position: 'relative',
                zIndex: activeTab === cat ? 1 : 0,
                color: 'var(--text-1, #000000)',
                flex: isMobile ? '0 0 auto' : `0 0 ${flexBasis}`,
                flexShrink: isMobile ? 0 : undefined,
                whiteSpace: 'nowrap',
                minWidth: 0,
                boxSizing: 'border-box',
                textAlign: 'center'
              }}
            >
              {cat} ({rarityData[cat].length})
            </button>
          );
        })}
      </div>

      {/* Content Area - Main container (no longer scrollable, window body scrolls) */}
      <div 
        className="rarity-explorer-content-area"
        style={{
          display: 'flex',
          flexDirection: 'column',
          margin: '0 8px 0 8px',
          background: 'var(--inset-face, #ffffff)',
          border: '2px solid',
          borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)'
        }}
      >
          {/* Toolbar - Fixed */}
          <div style={{
            background: 'var(--surface-1, #c0c0c0)',
            padding: '8px',
            borderBottom: '2px solid',
            borderColor: 'var(--border-dark) var(--border-light) var(--border-light) var(--border-dark)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            flexShrink: 0
          }}>
            {/* Rarity Legend */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
              fontSize: '11px',
              color: 'var(--text-1, #000000)'
            }}>
              {Object.entries(tierColors).map(([tier, colors]) => (
                <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    background: colors.bg,
                    border: '2px solid',
                    borderColor: `${colors.border} ${colors.bgLight} ${colors.bgLight} ${colors.border}`,
                    boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.3)',
                    display: 'inline-block'
                  }} />
                  <span>{tier.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Traits List - No longer scrollable, window body scrolls */}
          <div 
            ref={parentRef}
            style={{
              display: 'flex'
            }}>
            <div 
              ref={scrollableRef}
              className="traits-list-scrollable"
              style={{ 
                flex: 1,
                padding: '8px 8px 16px 8px',
                boxSizing: 'border-box',
                scrollBehavior: 'smooth'
              }}
            >
            {isLoading ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px',
                fontSize: '12px',
                color: 'var(--text-2, #666)'
              }}>
                Loading...
              </div>
            ) : (
              filteredData.map((trait, idx) => {
                // Use cluster-based tier lookup instead of percentage-based tier
                const tier = getTraitTier(trait.name, activeTab);
                const traitWithTier = { ...trait, tier };
                
                const isHighlighted = selectedNft && (
                  (activeTab === 'Base' && trait.name === selectedNft[3]) ||
                  (activeTab === 'Face' && trait.name === selectedNft[4]) ||
                  (activeTab === 'Mouth' && trait.name === selectedNft[5]) ||
                  (activeTab === 'Face Wear' && trait.name === selectedNft[6]) ||
                  (activeTab === 'Head' && trait.name === selectedNft[7]) ||
                  (activeTab === 'Clothes' && trait.name === selectedNft[8]) ||
                  (activeTab === 'Background' && trait.name === selectedNft[9])
                );

                const rowStyle = getRowStyle(traitWithTier, idx);

                return (
                  <div
                    key={trait.name}
                    data-highlighted={isHighlighted ? 'true' : 'false'}
                    onMouseEnter={() => setHoveredTrait(trait.name)}
                    onMouseLeave={() => setHoveredTrait(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 8px',
                      marginBottom: '4px',
                      minHeight: '40px',
                      height: '40px',
                      ...rowStyle,
                      transition: 'all 0.1s'
                    }}
                  >
                    <div style={{
                      width: '30px',
                      fontSize: '11px',
                      color: 'var(--text-2, #888)',
                      textAlign: 'center'
                    }}>
                      #{idx + 1}
                    </div>

                    <div 
                      className={tier === 'legendary' ? 'legendary-tier-badge' : ''}
                      style={{
                        width: '115px',
                        padding: '3px 8px',
                        background: tierColors[tier].bg,
                        color: tierColors[tier].text,
                        fontSize: '9px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginLeft: '10px',
                        marginRight: '10px',
                        textTransform: 'uppercase',
                        border: '2px solid',
                        borderColor: `${tierColors[tier].border} ${tierColors[tier].bgLight} ${tierColors[tier].bgLight} ${tierColors[tier].border}`,
                        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.3)',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tier.toUpperCase()}
                    </div>

                    <div style={{
                      width: '140px',
                      fontSize: '12px',
                      fontWeight: tier === 'legendary' ? 'bold' : 'normal',
                      color: tier === 'legendary' ? '#FF6600' : 'var(--text-1, #000000)'
                    }}>
                      {trait.name}
                    </div>

                    <div style={{
                      flex: 1,
                      height: '18px',
                      background: 'var(--surface-2, #e0e0e0)',
                      border: '1px solid var(--border-dark)',
                      marginRight: '10px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${(trait.count / maxCount) * 100}%`,
                        background: `linear-gradient(to bottom, ${tierColors[tier].bgLight}dd, ${tierColors[tier].bg}dd)`,
                        transition: 'width 0.3s ease'
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 6px)'
                      }} />
                    </div>

                    <div style={{
                      width: '70px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      color: 'var(--text-1, #000000)'
                    }}>
                      {trait.count.toLocaleString()}
                    </div>

                    <div style={{
                      width: '60px',
                      textAlign: 'right',
                      fontSize: '11px',
                      color: 'var(--text-2, #666)',
                      fontFamily: 'monospace'
                    }}>
                      {formatPercentage(trait.pct)}%
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>

      {/* Error Dialog */}
      {showError && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: 'var(--surface-1, #c0c0c0)',
            border: '2px solid',
            borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
            boxShadow: '2px 2px 0 var(--text-1, #000)',
            minWidth: '300px'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, var(--title-active-bg, #000080), var(--dialog-blue-light, #1084d0))',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>
                ⚠️ Error
              </span>
            </div>
            
            <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '32px' }}>❌</span>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-1, #000000)' }}>
                  This is not a valid Wojak Farmers Plot NFT ID.
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-2, #666)' }}>
                  Please enter a number between 0001 and 4200.
                </p>
              </div>
            </div>
            
            <div style={{ padding: '8px 16px 16px', textAlign: 'center' }}>
              <button
                onClick={() => setShowError(false)}
                style={{
                  padding: '4px 24px',
                  fontSize: '12px',
                  background: 'var(--surface-1, #c0c0c0)',
                  border: '2px solid',
                  borderColor: 'var(--border-light) var(--border-dark) var(--border-dark) var(--border-light)',
                  cursor: 'pointer',
                  color: 'var(--text-1, #000000)'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(WojakRarityExplorer);
