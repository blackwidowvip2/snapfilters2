import type { FilterDefinition } from '../types';

export const FILTER_CATEGORIES = [
  { id: 'animal'    as const, label: '🐾 Dyr' },
  { id: 'makeup'    as const, label: '💄 Makeup' },
  { id: 'character' as const, label: '👻 Karakter' },
  { id: 'distortion' as const, label: '🤪 Forvrængning' },
  { id: 'style'     as const, label: '🎨 Stil' },
  { id: 'effect'    as const, label: '✨ Effekt' },
  { id: 'props'     as const, label: '🕶️ Props' },
];

export const FILTERS: FilterDefinition[] = [
  // Animal
  { id:'dog',              label:'Hund',        icon:'🐶', category:'animal',    description:'Hunde-ører, næse og tunge' },
  { id:'cat',              label:'Kat',          icon:'🐱', category:'animal',    description:'Katteøjne med slidsepupiller' },
  { id:'bunny',            label:'Kanin',        icon:'🐰', category:'animal',    description:'Lange ører og lyserød næse' },
  { id:'fox',              label:'Ræv',          icon:'🦊', category:'animal',    description:'Spidse ører og hvide kinder' },
  { id:'lion',             label:'Løve',         icon:'🦁', category:'animal',    description:'Animeret manke og knurhår' },
  { id:'horse',            label:'Hest',         icon:'🐴', category:'animal',    description:'3D hestehoved-maske' },
  // Makeup
  { id:'lip_red',          label:'Rød læbe',     icon:'💋', category:'makeup',   description:'Klassisk rød læbestift' },
  { id:'lip_pink',         label:'Pink læbe',    icon:'🌸', category:'makeup',   description:'Blød pink med glans' },
  { id:'eyeshadow_smoky',  label:'Smoky Eye',    icon:'🖤', category:'makeup',   description:'Blended sort øjenskygge' },
  { id:'eyeshadow_glam',   label:'Glitter Eye',  icon:'✨', category:'makeup',   description:'Guldglitter øjenskygge' },
  { id:'full_glam',        label:'Full Glam',    icon:'👑', category:'makeup',   description:'Kontur + highlighter + vipper' },
  // Character
  { id:'vampire',          label:'Vampyr',       icon:'🧛', category:'character', description:'Hugtænder og blod' },
  { id:'zombie',           label:'Zombie',       icon:'🧟', category:'character', description:'Blodskudte øjne og sår' },
  { id:'devil',            label:'Djævel',       icon:'😈', category:'character', description:'Røde horn og glødende øjne' },
  { id:'angel',            label:'Engel',        icon:'😇', category:'character', description:'Glødende glorie og vinger' },
  { id:'alien',            label:'Alien',        icon:'👽', category:'character', description:'Store sorte øjne og glød' },
  { id:'alien_face',      label:'Alien Ansigt', icon:'🛸', category:'character', description:'Lysende mandelformede øjne og bioluminescens' },
  { id:'batman2',         label:'Batman',       icon:'🦇', category:'character', description:'3D Batman-cowl' },
  { id:'third_eye',       label:'Tredje Øje',   icon:'👁️', category:'character', description:'Mystisk lilla øje åbner sig på panden' },
  { id:'clown',           label:'Klovn',        icon:'🤡', category:'character', description:'Hvidt ansigt, røde kinder, stor rød mund, 3D-næse og krøllet regnbuehår' },
  // Style
  { id:'neon',             label:'Neon',         icon:'⚡', category:'style',    description:'Farverige kantlinjer på mørk baggrund' },
  { id:'neon_outline',    label:'Neon Kontur',  icon:'🌈', category:'style',    description:'Glødende neon-kontur langs ansigtslandmarks' },
  { id:'neon_dark',       label:'Neon Mørk',    icon:'🌑', category:'style',    description:'Helt sort baggrund med lysende neon-ansigtskontur' },
  { id:'pencil_sketch',   label:'Blyantskitse', icon:'✏️', category:'style',    description:'Hvid baggrund med mørke blyantstreger' },
  { id:'cyberpunk',        label:'Cyberpunk',    icon:'🤖', category:'style',    description:'HUD-ringe, kredsløb og scanning' },
  { id:'gold',             label:'Guld',         icon:'🏆', category:'style',    description:'Guldpartikler og metallic makeup' },
  { id:'cartoon',          label:'Tegneserie',   icon:'🎨', category:'style',    description:'Fed omrids og halvtone-rødme' },
  { id:'noir',             label:'Noir',         icon:'🎞️', category:'style',   description:'Sort/hvid med filmkorn og vignette' },
  { id:'watercolor',       label:'Akvarel',      icon:'🖌️', category:'style',   description:'Bløde pastelfarver' },
  { id:'oil_paint',        label:'Olie-maleri',  icon:'🖼️', category:'style',   description:'Malet penselstrøg og rige farver' },
  // Effect
  { id:'glitch',           label:'Glitch',       icon:'📺', category:'effect',   description:'RGB-kanal split og støj' },
  { id:'kaleidoscope',     label:'Kaleidoskop',  icon:'🔮', category:'effect',   description:'Ansigtet spejles i 4-vejs kaleidoskop-mønster' },
  { id:'thermal',          label:'Termisk',      icon:'🌡️', category:'effect',  description:'Infrarød varmekort-palet' },
  { id:'night_vision',     label:'Nattesyn',     icon:'🌙', category:'effect',   description:'Grøn nattesyn med crosshair' },
  { id:'hologram',         label:'Hologram',     icon:'💠', category:'effect',   description:'Cyan holografisk overlay' },
  { id:'infrared',         label:'Infrared',     icon:'🔴', category:'effect',   description:'Infrarød farvepalet' },
  // Props (3D via Three.js)
  { id:'sunglasses',       label:'Solbriller',   icon:'🕶️', category:'props',    description:'3D solbriller med glas-refleksion' },
  { id:'party_glasses',    label:'Party Briller', icon:'🥳', category:'props',    description:'3D party-briller' },
  { id:'anon_mask',        label:'Anon Maske',    icon:'🎭', category:'props',    description:'3D anonymous-maske' },
  { id:'anonymous_mask',   label:'Anonymous',     icon:'👤', category:'props',    description:'3D Anonymous / Guy Fawkes-maske' },
  { id:'ironman',          label:'Iron Man',      icon:'🤖', category:'props',    description:'3D Iron Man-hjelm' },
  { id:'agf_cap',          label:'AGF Kasket',    icon:'🧢', category:'props',    description:'3D AGF-kasket ovenpå hovedet' },
  { id:'agf_cap_logo',     label:'AGF Kasket Logo', icon:'🧢', category:'props',  description:'Hvid kasket med AGF-byvåben på fronten' },
  { id:'agf_fan',          label:'AGF Fan',       icon:'🔴', category:'props',    description:'AGF-logo malet på begge kinder' },
  // Distortion (image warps)
  { id:'big_mouth',       label:'Stor Mund',    icon:'👄', category:'distortion', description:'Munden forstørres kraftigt' },
  { id:'huge_mouth',      label:'Ekstra Stor Mund', icon:'😮', category:'distortion', description:'Munden forstørres ekstremt (75% mere end Stor Mund)' },
  { id:'big_lips',        label:'Store Læber',  icon:'💋', category:'distortion', description:'Læberne forstørres til dobbelt størrelse' },
  { id:'big_nose',        label:'Stor Næse',    icon:'👃', category:'distortion', description:'Næsen forstørres kraftigt' },
  { id:'big_ears',        label:'Store Ører',   icon:'👂', category:'distortion', description:'Ørerne forstørres' },
  { id:'big_eyes',        label:'Store Øjne',   icon:'👀', category:'distortion', description:'Forstørrede øjne via billedwarp' },
  { id:'big_eyes_mouth',  label:'Øjne + Mund',  icon:'🤡', category:'distortion', description:'Store øjne og stor mund kombineret' },
  { id:'long_forehead',   label:'Lang Pande',   icon:'🥚', category:'distortion', description:'Panden bliver dobbelt så lang' },
  { id:'alien_head',      label:'Alien Hoved',  icon:'🛸', category:'distortion', description:'Hovedet smalner mod hagen som en alien' },
  { id:'compress_lower',  label:'Komprimer Nederste', icon:'⬇️', category:'distortion', description:'Nederste del af ansigtet komprimeres' },
  { id:'compress_upper',  label:'Komprimer Øverste',  icon:'⬆️', category:'distortion', description:'Øverste del af ansigtet komprimeres' },
  { id:'slim_face',       label:'Smalt Ansigt', icon:'💆', category:'distortion', description:'Slankt ansigt via pixel-kontrahering' },
  { id:'swirl_face',      label:'Hvirvel',      icon:'🌀', category:'distortion', description:'Hvirvlende ansigtswarp' },
  { id:'melt_face',       label:'Smeltet Ansigt', icon:'🫠', category:'distortion', description:'Ansigtet smelter ned med dryppende warp-effekt' },
];

export const ALL_FILTERS: FilterDefinition[] = [
  { id:'none', label:'Ingen', icon:'🚫', category:'animal', description:'Intet filter' },
  ...FILTERS,
];
