import { reatomComponent } from "@reatom/npm-react";
import { tv, type VariantProps } from "tailwind-variants";
import { landBannerAtom } from "../models/land.model";
import { useRef } from "react";
import { landChangesAtom, landMode, newBannerUrl } from "../models/edit-land.model";
import { IconColorPicker } from "@tabler/icons-react";

const imageBannerVariant = tv({
  base: `select-none w-full h-full object-cover max-w-[144px]`
})

const bannerVariants = tv({
  base: `relative group rounded-lg overflow-hidden bg-green-600`,
  variants: {
    variant: {
      default: "w-[144px] h-44",
      small: "w-[86px] h-32"
    }
  },
  defaultVariants: {
    variant: "default"
  }
})

type DefaultBannerProps = VariantProps<typeof bannerVariants> & { banner: string | null, className?: string }

export const DefaultBanner = reatomComponent<DefaultBannerProps>(({ ctx, banner, variant, className }) => {
  return (
    <div
      id="banner"
      className={bannerVariants({ variant, className })}
    >
      {banner ? (
        <img
          src={banner}
          className={imageBannerVariant()}
          alt="Banner"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  )
}, "EditBanner")

export const LandBanner = reatomComponent(({ ctx }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  const isEdit = ctx.spy(landMode) === 1
  const currentBanner = ctx.spy(landBannerAtom)
  const newBanner = ctx.spy(newBannerUrl)
  const editIsAllow = isEdit && !newBanner

  const handle = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.files ? e.currentTarget.files[0] : null

    if (value) {
      const url = URL.createObjectURL(value)
      landChangesAtom(ctx, (state) => ({ ...state, "banner": [url] }))
    }
  }

  const handleOpen = () => {
    if (editIsAllow) {
      ref.current?.click()
    }
  }

  return (
    <div
      id="banner"
      data-mode={editIsAllow ? "edit" : "watch"}
      onClick={handleOpen}
      className="data-[mode=edit]:cursor-pointer relative group w-[144px] rounded-lg overflow-hidden h-44 bg-green-600"
    >
      {editIsAllow ? (
        <div className="flex items-center justify-center z-1 absolute h-full w-full bg-black/60">
          <IconColorPicker size={26} />
        </div>
      ) : (
        currentBanner ? (
          <img
            src={currentBanner}
            className={imageBannerVariant()}
            alt="Banner"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full" />
        )
      )}
      {newBanner && (
        <img
          draggable={false}
          src={newBanner}
          className={imageBannerVariant()}
          alt="Banner"
        />
      )}
      <input
        ref={ref}
        className="hidden"
        type="file"
        multiple={false}
        onChange={handle}
      />
    </div>
  )
}, "LandBanner")