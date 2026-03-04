export const MESSAGES = {
  night: [
    { emoji: '☕🍺', text: 'Nočný balans medzi kofeínom a chmeľom.' },
    { emoji: '🧠', text: 'Mozog chce fokus. Atmosféra chce ďalšie.' },
    { emoji: '🌙', text: 'Večer začal nevinne. Teraz sa rieši vesmír.' },
    { emoji: '🔥', text: 'Debata naberá grády. Logika pomaly odchádza.' },
    { emoji: '🎧', text: 'Playlist hrá. My filozofujeme.' },
    { emoji: '🍺', text: 'Posledné kolo. Tentokrát naozaj.' },
    { emoji: '💡', text: 'Toto je brutálny nápad. Zapamätaj si ho.' },
    { emoji: '🌌', text: 'Ambície veľké. Zajtrajšok otázny.' },
  ],

  morning: [
    { emoji: '🌅', text: 'Dobré ráno. Realita prichádza potichu.' },
    { emoji: '☕', text: 'Ráno zachraňuje jediné.' },
    { emoji: '😵', text: 'Včera to dávalo väčší zmysel.' },
    { emoji: '🛌', text: 'Reštart systému prebieha…' },
    { emoji: '📉', text: 'Energia nízka. Spomienky selektívne.' },
    { emoji: '🚿', text: 'Sprcha = návrat medzi civilizáciu.' },
    { emoji: '🥴', text: 'Mentálny update sa nepodaril.' },
    { emoji: '🍳', text: 'Raňajky by pomohli. Možno.' },
  ],

  noon: [
    { emoji: '☀️', text: 'Pol dňa preč. Ideme sa tváriť produktívne.' },
    { emoji: '🍽️', text: 'Obed ako odmena za existenciu.' },
    { emoji: '💬', text: 'Dnes už fakt začneme.' },
    { emoji: '🧠', text: 'Káva číslo dva. Nádej žije.' },
    { emoji: '📈', text: 'Sebavedomie rastie rýchlejšie než výsledky.' },
    { emoji: '🎯', text: 'Cieľ dňa: aspoň niečo.' },
    { emoji: '🛋️', text: 'Krátka pauza. Už dlhšia.' },
    { emoji: '🍺', text: 'Je ešte skoro? Teoreticky áno.' },
  ],

  afternoon: [
    { emoji: '🔥', text: 'Teraz ideme naplno. Fakt.' },
    { emoji: '📊', text: 'Plán bol jednoduchý. Realita kreatívna.' },
    { emoji: '🎮', text: 'Chceli sme robiť. Stalo sa niečo iné.' },
    { emoji: '☕', text: 'Ešte jedno povzbudenie.' },
    { emoji: '💡', text: 'To je geniálne. Ale až zajtra.' },
    { emoji: '🍕', text: 'Chýba už len pizza.' },
    { emoji: '😎', text: 'Vyzerá to, že máme všetko pod kontrolou.' },
    { emoji: '🎧', text: 'Fokus mód. Teoreticky.' },
  ],

  evening: [
    { emoji: '🌆', text: 'Večer. Čas robiť veľké rozhodnutia.' },
    { emoji: '🍺', text: 'Jedno na uvoľnenie. A potom už nič.' },
    { emoji: '🎉', text: 'Atmosféra stúpa. Disciplína klesá.' },
    { emoji: '🚀', text: 'Buď vznikne plán… alebo príbeh.' },
    { emoji: '🎶', text: 'Hudba hrá. Realita čaká.' },
    { emoji: '🧠', text: 'Najlepšie myšlienky prichádzajú po siedmej.' },
    { emoji: '🍻', text: 'Na dobrý večer. A lepšie ráno.' },
    { emoji: '✨', text: 'Zajtra budeme rozumnejší. Asi.' },
  ],
}

export function getFunnyMessage() {
  const h = new Date().getHours()
  let slot
  if (h < 6) slot = 'night'
  else if (h < 10) slot = 'morning'
  else if (h < 13) slot = 'noon'
  else if (h < 17) slot = 'afternoon'
  else if (h < 23) slot = 'evening'
  else slot = 'night'
  const pool = MESSAGES[slot]
  return pool[Math.floor(Math.random() * pool.length)]
}
