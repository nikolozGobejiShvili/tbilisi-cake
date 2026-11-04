import Image from "next/image";

type Props = {
  src: string;
  width: number;
  height: number;
  alt: string;
  priority?: boolean;
  className?: string;
  /** Fills a tile of fixed shape, cropping evenly, instead of showing the whole photo at its own shape. */
  tile?: boolean;
  /** How wide the tile is shown, for choosing the right file. */
  sizes?: string;
};

/**
 * A work's photo. The current files are small crops, so they skip the image optimiser. Larger
 * originals go through it automatically once they replace these.
 */
export function Photo({ src, width, height, alt, priority = false, className = "", tile = false, sizes }: Props) {
  return (
    <Image
      src={src}
      width={width}
      height={height}
      alt={alt}
      priority={priority}
      unoptimized={width <= 640 || src.startsWith("/media/")}
      sizes={sizes ?? `(max-width: ${width}px) 100vw, ${width}px`}
      className={`${tile ? "photo-tile" : "look-photo"} ${className}`}
      style={tile ? undefined : { maxWidth: width }}
    />
  );
}
