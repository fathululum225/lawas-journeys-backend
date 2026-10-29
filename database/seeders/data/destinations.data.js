'use strict';

const DRY_SEASON = { months: 'May – September', note: 'Best for outdoor activities' };
const RAINY_SEASON = { months: 'October – April', note: 'Fewer crowds & lush nature' };

module.exports = [
  {
    slug: 'yogyakarta',
    name: 'Yogyakarta',
    tagline: 'The heart of Javanese culture',
    description:
      'The heart of Javanese culture, where ancient heritage, royal traditions, art, and warm hospitality come together in perfect harmony.',
    image: 'assets/images/destinations/yogyakarta.svg',
    sortOrder: 1,
    bestTime: {
      summary:
        'Yogyakarta can be visited all year round. The best time is during the dry season from May to September when the weather is pleasant for exploring outdoor attractions.',
      dry: DRY_SEASON,
      rainy: RAINY_SEASON,
    },
    attractions: [
      {
        name: 'Borobudur Temple',
        location: 'Magelang',
        description: "World's largest Buddhist temple, a UNESCO World Heritage Site.",
        image: 'assets/images/attractions/borobudur-temple.svg',
      },
      {
        name: 'Prambanan Temple',
        location: 'Sleman',
        description: 'Magnificent Hindu temple complex with stunning ancient architecture.',
        image: 'assets/images/attractions/prambanan-temple.svg',
      },
      {
        name: 'Yogyakarta Palace',
        location: 'Yogyakarta',
        description: 'The royal palace of Yogyakarta and center of Javanese culture.',
        image: 'assets/images/attractions/yogyakarta-palace.svg',
      },
      {
        name: 'Malioboro Street',
        location: 'Yogyakarta',
        description: 'Famous cultural street for shopping, culinary and local vibes.',
        image: 'assets/images/attractions/malioboro-street.svg',
      },
      {
        name: 'Jomblang Cave',
        location: 'Gunungkidul',
        description: 'A natural vertical cave with magical sunlight from above.',
        image: 'assets/images/attractions/jomblang-cave.svg',
      },
    ],
  },
  {
    slug: 'central-java',
    name: 'Central Java',
    tagline: 'Temples, kingdoms & timeless traditions',
    description:
      'From the Dieng highlands to the early-human fossils of Sangiran, Central Java layers Hindu-Buddhist temples, royal courts and colonial towns across one of the most storied landscapes in Indonesia.',
    image: 'assets/images/destinations/central-java.svg',
    sortOrder: 2,
    bestTime: {
      summary:
        'Central Java is rewarding year-round, but the dry months from May to September make temple hopping and highland walks far more comfortable.',
      dry: DRY_SEASON,
      rainy: { months: 'October – April', note: 'Misty highlands & green rice terraces' },
    },
    attractions: [
      {
        name: 'Dieng Plateau Temples',
        location: 'Wonosobo',
        description: 'One of the oldest Hindu temple groups in Java, set on a cool volcanic plateau.',
        image: 'assets/images/attractions/dieng-plateau-temples.svg',
      },
      {
        name: 'Sangiran Early Man Site',
        location: 'Sragen',
        description: 'A UNESCO-listed site yielding some of the richest early human fossils in Asia.',
        image: 'assets/images/attractions/sangiran-early-man-site.svg',
      },
      {
        name: 'Gedong Songo',
        location: 'Semarang',
        description: 'Nine hilltop temples with sweeping views over Mount Ungaran.',
        image: 'assets/images/attractions/gedong-songo.svg',
      },
      {
        name: 'Sukuh Temple',
        location: 'Karanganyar',
        description: 'A pyramid-shaped late Hindu temple with unusual reliefs on the slopes of Mount Lawu.',
        image: 'assets/images/attractions/sukuh-temple.svg',
      },
      {
        name: 'Kota Lama Semarang',
        location: 'Semarang',
        description: 'A walkable colonial quarter of European-style warehouses and churches.',
        image: 'assets/images/attractions/kota-lama-semarang.svg',
      },
    ],
  },
  {
    slug: 'east-java',
    name: 'East Java',
    tagline: 'Ancient kingdoms & natural wonders',
    description:
      'Seat of the Majapahit empire and home to restless volcanoes, East Java pairs brick-built royal ruins with some of the most dramatic natural scenery in the archipelago.',
    image: 'assets/images/destinations/east-java.svg',
    sortOrder: 3,
    bestTime: {
      summary:
        'The dry season from May to September brings clear skies for volcano viewpoints and ruin-to-ruin exploration across the region.',
      dry: DRY_SEASON,
      rainy: { months: 'October – April', note: 'Lush landscapes, afternoon showers' },
    },
    attractions: [
      {
        name: 'Trowulan Majapahit Site',
        location: 'Mojokerto',
        description: 'The archaeological area widely believed to be the Majapahit capital.',
        image: 'assets/images/attractions/trowulan-majapahit-site.svg',
      },
      {
        name: 'Mount Bromo',
        location: 'Probolinggo',
        description: 'An active volcano rising from a sea of sand, sacred to the Tenggerese people.',
        image: 'assets/images/attractions/mount-bromo.svg',
      },
      {
        name: 'Singosari Temple',
        location: 'Malang',
        description: 'A 13th-century temple from the Singhasari kingdom, a precursor to Majapahit.',
        image: 'assets/images/attractions/singosari-temple.svg',
      },
      {
        name: 'Penataran Temple',
        location: 'Blitar',
        description: 'The largest Hindu temple complex in East Java, in use across several kingdoms.',
        image: 'assets/images/attractions/penataran-temple.svg',
      },
      {
        name: 'Ijen Crater',
        location: 'Banyuwangi',
        description: 'A turquoise acid lake and sulfur-mining landscape inside a volcanic caldera.',
        image: 'assets/images/attractions/ijen-crater.svg',
      },
    ],
  },
  {
    slug: 'eastern-indonesia',
    name: 'Eastern Indonesia',
    tagline: 'Islands of history, nature & culture',
    description:
      'From the spice islands of Banda to the highlands of Toraja and the dragon-guarded shores of Komodo, Eastern Indonesia is where distant histories and living cultures meet the sea.',
    image: 'assets/images/destinations/eastern-indonesia.svg',
    sortOrder: 4,
    bestTime: {
      summary:
        'Conditions vary by island, but the drier months from April to October are generally best for sailing, trekking and village visits.',
      dry: { months: 'April – October', note: 'Calm seas & clear trails' },
      rainy: { months: 'November – March', note: 'Quieter islands, rougher crossings' },
    },
    attractions: [
      {
        name: 'Banda Neira',
        location: 'Maluku',
        description: 'The former heart of the nutmeg trade, with Dutch forts and exile houses.',
        image: 'assets/images/attractions/banda-neira.svg',
      },
      {
        name: 'Komodo National Park',
        location: 'Labuan Bajo',
        description: 'Dragon habitat, pink beaches and rugged islands, a UNESCO World Heritage Site.',
        image: 'assets/images/attractions/komodo-national-park.svg',
      },
      {
        name: 'Tana Toraja',
        location: 'South Sulawesi',
        description: 'Highland villages of boat-roofed tongkonan houses and elaborate funeral rites.',
        image: 'assets/images/attractions/tana-toraja.svg',
      },
      {
        name: 'Wae Rebo Village',
        location: 'Flores',
        description: 'A remote mountain village of conical houses preserved by its community.',
        image: 'assets/images/attractions/wae-rebo-village.svg',
      },
      {
        name: 'Kelimutu Lakes',
        location: 'Flores',
        description: 'Three crater lakes that shift colour, revered in local belief.',
        image: 'assets/images/attractions/kelimutu-lakes.svg',
      },
    ],
  },
];
