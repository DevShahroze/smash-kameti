import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 96,
};

export function AppLogo({
  size = "sm",
  pixelSize,
  src,
  className,
  priority = false,
}) {
  const px = pixelSize ?? SIZES[size] ?? SIZES.sm;
  const imageSrc =
    src ?? (px > 256 ? "/brand/smash-kameti-512.png" : "/brand/smash-kameti-256.png");
  return (
    <Image
      src={imageSrc}
      alt=""
      width={px}
      height={px}
      sizes={`${px}px`}
      className={cn("shrink-0 rounded-md", className)}
      priority={priority}
      aria-hidden
    />
  );
}