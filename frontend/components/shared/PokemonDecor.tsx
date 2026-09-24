import { POKEMON_EMOJIS, type PokemonDecorItem } from "@/lib/pokemon-emojis";
import { cn } from "@/lib/utils";

const ANIMATE_CLASS: Record<NonNullable<PokemonDecorItem["animate"]>, string> = {
  float: "animate-float",
  "float-rotate": "animate-float-rotate",
  "bounce-slow": "animate-bounce-slow",
  none: "",
};

type PokemonDecorProps = PokemonDecorItem;

export function PokemonDecor({
  emoji,
  className,
  size = 64,
  style,
  animate = "float",
  opacity = 0.9,
  flip,
}: PokemonDecorProps) {
  const asset = POKEMON_EMOJIS[emoji];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset.src}
      alt=""
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-0 select-none object-contain drop-shadow-md",
        ANIMATE_CLASS[animate],
        className
      )}
      style={{
        width: size,
        height: size,
        opacity,
        transform: flip ? "scaleX(-1)" : undefined,
        ...style,
      }}
    />
  );
}

export function PokemonScatter({ items }: { items: PokemonDecorItem[] }) {
  return (
    <>
      {items.map((item, i) => (
        <PokemonDecor key={`${item.emoji}-${i}`} {...item} />
      ))}
    </>
  );
}
