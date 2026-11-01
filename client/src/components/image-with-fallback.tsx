import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../lib/format";

export function ImageWithFallback({
  src,
  alt,
  className,
  imgClassName,
}: {
  src: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  const imageSrc = src?.startsWith("/uploads/")
    ? `${apiBase}${src}`
    : src;

  useEffect(() => {
    setFailed(false);
  }, [imageSrc]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-cream-200 via-cream-100 to-terracotta-50",
        className
      )}
    >
      {!failed && imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-espresso-300">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
