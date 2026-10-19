const MESSAGES_BY_TIME_OF_DAY = {
  night: [
    { emoji: '☕🍺', text: 'Nočný balans medzi kofeínom a chmeľom.' },
    { emoji: '🧠', text: 'Mozog chce fokus. Atmosféra chce ďalšie.' },
    { emoji: '🌙', text: 'Večer začal nevinne. Teraz sa rieši vesmír.' },
    { emoji: '🔥', text: 'Debata naberá grády. Logika pomaly odchádza.' },
    { emoji: '🎧', text: 'Playlist hrá. My filozofujeme.' },
    { emoji: '🍺', text: 'Posledné kolo. Tentokrát naozaj.' },
    { emoji: '💡', text: 'Toto je brutálny nápad. Zapamätaj si ho.' },
    { emoji: '🌌', text: 'Ambície veľké. Zajtrajšok otázny.' },
    { emoji: '🦉', text: 'Sovy sú hore. My tiež.' },
    { emoji: '🕛', text: 'Polnoc prešla. Plány nie.' },
    { emoji: '🛸', text: 'O tomto čase dávajú zmysel aj konšpirácie.' },
    { emoji: '🍟', text: 'Hlad o polnoci je iný druh hladu.' },
    { emoji: '😴', text: 'Spánok je len návrh.' },
    { emoji: '🗝️', text: 'Kto zhasne posledný, zamyká.' },
    { emoji: '🌙', text: 'Pivo o polnoci nemá kalórie. Všetky už spia.' },
    { emoji: '🔁', text: '„Kedy ideme domov?“ „Keď dopijeme.“ „A kedy dopijeme?“ „Keď pôjdeme domov.“' },
    { emoji: '🍻', text: 'Optimista vidí pohár poloplný, pesimista poloprázdny. My vidíme ďalšie kolo.' },
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
    { emoji: '⏰', text: 'Budík vyhral. Tentokrát.' },
    { emoji: '🐌', text: 'Tempo dnes: rozvážne.' },
    { emoji: '🫠', text: 'Telo je tu. Duša príde neskôr.' },
    { emoji: '📵', text: 'Najprv káva, potom ľudia.' },
    { emoji: '🌫️', text: 'Hmla vonku. Hmla vnútri.' },
    { emoji: '🧃', text: 'Hydratácia je tiež šport.' },
    { emoji: '🩺', text: 'Lekár: „Mali by ste obmedziť kávu.“ Ja: „Jasné, odteraz len z jedného hrnčeka.“' },
    { emoji: '🙂', text: '„Ako sa máš?“ „Na prvú kávu celkom dobre.“' },
    { emoji: '🛏️', text: 'Neviem, čo by som bez kávy robil. Asi spal.' },
    { emoji: '💪', text: 'Každý deň je nová šanca. Túto sme zatiaľ prespali.' },
    { emoji: '🏔️', text: 'Vrchol je na dosah. Najprv ale treba vstať z postele.' },
    { emoji: '🚀', text: 'Ver si. Aspoň kým nezačne porada.' },
    { emoji: '🌱', text: 'Veľké ciele začínajú malými krokmi. Prvý krok: kávovar.' },
    { emoji: '🦁', text: 'Ráno vstávajú víťazi. Ostatní tiež, len neradi.' },
    { emoji: '✨', text: 'Buď tou verziou seba, ktorá už vypila kávu.' },
    { emoji: '🎯', text: 'Tvoj jediný limit si ty. A budík.' },
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
    { emoji: '🥪', text: 'Desiata sa nepočíta. Obed áno.' },
    { emoji: '📅', text: 'Polovica dňa. Polovica motivácie.' },
    { emoji: '🪫', text: 'Batéria na 50 %. Dobíjame kofeínom.' },
    { emoji: '🤝', text: 'Porada mohla byť e-mail.' },
    { emoji: '🍝', text: 'Sýty človek, pomalý človek.' },
    { emoji: '⏳', text: 'Do večera je ešte ďaleko. Bohužiaľ.' },
    { emoji: '🍽️', text: '„Čo bude na obed?“ „Káva.“ „A k tomu?“ „Druhá káva.“' },
    { emoji: '💻', text: 'Programátor je stroj na premenu kávy na kód. Dnes beží naplno.' },
    { emoji: '🧾', text: 'Dlh je len číslo. Bohužiaľ, presné.' },
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
    { emoji: '🥱', text: 'Popoludňajší útlm prišiel presne načas.' },
    { emoji: '📝', text: 'Zoznam úloh rastie sám od seba.' },
    { emoji: '🏁', text: 'Cieľ je na dohľad. Teda skoro.' },
    { emoji: '🍰', text: 'Niečo sladké by tomu pomohlo.' },
    { emoji: '🧩', text: 'Ešte jedna vec a končíme. Klasika.' },
    { emoji: '🐢', text: 'Pomaly, ale isto. Hlavne pomaly.' },
    { emoji: '☕', text: '„Idem na kávu.“ „Veď si bol pred hodinou.“ „No práve, tá už nezaberá.“' },
    { emoji: '📈', text: 'Produktivita rastie s každou kávou. Po tretej už rastie len tep.' },
    { emoji: '🤔', text: 'Káva nerieši problémy. Ale bez nej ich ani nezačnem riešiť.' },
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
    { emoji: '🛋️', text: 'Gauč volá. Zatiaľ odolávame.' },
    { emoji: '🃏', text: 'Ešte jedna partia a ideme.' },
    { emoji: '🍕', text: 'Večera je len zámienka.' },
    { emoji: '🌃', text: 'Mesto svieti. My tiež.' },
    { emoji: '📺', text: 'Jedna epizóda. Možno tri.' },
    { emoji: '🧯', text: 'Atmosféra horí. Rozum hasí.' },
    { emoji: '🍺', text: '„Idem len na jedno.“ Najčastejší začiatok najdlhších príbehov.' },
    { emoji: '🩺', text: '„Pán doktor, koľko piva je zdravé?“ „Jedno.“ „A koľko je dosť?“ „To vám povie ráno.“' },
    { emoji: '🧮', text: 'Jedno pivo je málo, tri sú veľa. Preto si dáme štyri.' },
  ],
}

function timeOfDay(hour) {
  if (hour < 6) return 'night'
  if (hour < 10) return 'morning'
  if (hour < 13) return 'noon'
  if (hour < 17) return 'afternoon'
  if (hour < 23) return 'evening'
  return 'night'
}

/** A random light-hearted line that fits the current time of day. */
export function getFunnyMessage() {
  const messages = MESSAGES_BY_TIME_OF_DAY[timeOfDay(new Date().getHours())]
  return messages[Math.floor(Math.random() * messages.length)]
}
