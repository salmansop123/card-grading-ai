export const POKEMON_EMOJIS = {
  bulbasaur: { src: "/emojis/bulbasaur.gif", alt: "Bulbasaur" },
  charizard: { src: "/emojis/charizard.gif", alt: "Charizard" },
  charizardStill: { src: "/emojis/charizard.png", alt: "Charizard" },
  charmander: { src: "/emojis/charmander_shiny.gif", alt: "Charmander" },
  squirtleChill: { src: "/emojis/chill-squirtle.gif", alt: "Squirtle" },
  gengar: { src: "/emojis/gengar-laughq.gif", alt: "Gengar" },
  growlithe: { src: "/emojis/growlithe.gif", alt: "Growlithe" },
  gyarados: { src: "/emojis/gyarados.png", alt: "Gyarados" },
  squirtleJam: { src: "/emojis/jammin_squirtle.gif", alt: "Squirtle" },
  mew: { src: "/emojis/mew.png", alt: "Mew" },
  pikachuDance: { src: "/emojis/pikachu_dancing.gif", alt: "Pikachu" },
  pikachuVibe: { src: "/emojis/pikachu_vibing.gif", alt: "Pikachu" },
  pikachuYa: { src: "/emojis/pikachu_ya.gif", alt: "Pikachu" },
  pokeball: { src: "/emojis/pokeball.gif", alt: "Pokéball" },
  pokeballSpin: { src: "/emojis/pokeball-spin.gif", alt: "Pokéball" },
  pokeballSuccess: { src: "/emojis/pokeball-success.gif", alt: "Pokéball" },
  pokeballThrow: { src: "/emojis/pokeball-throwing.gif", alt: "Pokéball" },
  snorlax: { src: "/emojis/snorlaxwaffle0.png", alt: "Snorlax" },
} as const;

export type PokemonEmojiKey = keyof typeof POKEMON_EMOJIS;

export type PokemonDecorItem = {
  emoji: PokemonEmojiKey;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  animate?: "float" | "float-rotate" | "bounce-slow" | "none";
  opacity?: number;
  flip?: boolean;
};
