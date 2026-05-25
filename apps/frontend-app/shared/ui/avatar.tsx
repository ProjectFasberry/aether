import { type HTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { getStaticImage } from '@/shared/lib/volume-helpers';
import { Skeleton } from './skeleton';

export const avatarVariants = tv({
  base: `relative rounded-lg select-none aspect-square border border-neutral-800`,
  variants: {
    variant: {
      default: 'min-h-16 min-w-16 w-16 h-16 max-w-16 max-h-16',
    }
  },
})

type AvatarProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof avatarVariants> & {
  nickname?: string;
  url: string
}

const AVATAR_FALLBACK = getStaticImage("fallback/steve_head.png");

export const Avatar = ({ className, variant, url, nickname, ...props }: AvatarProps) => {
  const handleRef = (img: HTMLImageElement | null) => {
    if (!img) return;

    if (img.complete && img.naturalWidth === 0) {
      img.src = AVATAR_FALLBACK;
    }
  };

  return (
    <div
      className={avatarVariants({ variant, className })}
      {...props}
    >
      <img
        ref={handleRef}
        src={url}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = AVATAR_FALLBACK;
        }}
        className="absolute inset-0 w-full z-2 h-full rounded-sm"
        loading="eager"
        alt=""
        crossOrigin="anonymous"
      />
      <Skeleton className="w-full h-full z-0 absolute inset-0 rounded-sm" />
    </div>
  )
}
