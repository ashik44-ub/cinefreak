import Image from "next/image";

interface SafeImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

const TMDB_HOST = "https://image.tmdb.org/";

/**
 * next/image only allows configured remote hosts. All real posters come from
 * TMDB (configured in next.config.ts); any other external URL (e.g. legacy
 * data) falls back to a plain <img> so the page never crashes.
 */
export default function SafeImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  priority,
  className,
}: SafeImageProps) {
  if (!src) return null;
  if (src.startsWith(TMDB_HOST)) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={className}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={width ?? 500}
        height={height ?? 750}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }
  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width ?? 500}
      height={height ?? 750}
      className={className}
    />
  );
}
