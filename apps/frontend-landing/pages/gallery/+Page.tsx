import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { Typography } from "@repo/ui/typography";
import { Link } from "@/shared/components/config/link";
import { reatomComponent } from "@reatom/npm-react";
import { Button } from "@repo/ui/button";
import { getStaticObject } from "@/shared/lib/volume";
import { Carousel, CarouselContent, CarouselIndicator, CarouselItem, CarouselNavigation } from "@repo/ui/carousel";
import { MorphingDialog, MorphingDialogClose, MorphingDialogContainer, MorphingDialogContent, MorphingDialogTrigger } from "@repo/ui/morph-dialog";
import { atom } from "@reatom/core";
import { COMMUNITY_FOLDER_ITEM } from "@/shared/data/folders";
import { sectionVariant, sectionVariantChild } from "@/shared/styles/variants";
import { Overlay } from "@repo/ui/overlay";
import { WrapperTitle } from "@repo/ui/wrapper-title";

const commuinityGallery = [
	COMMUNITY_FOLDER_ITEM("moon"),
	COMMUNITY_FOLDER_ITEM("sunset"),
	COMMUNITY_FOLDER_ITEM("market"),
	COMMUNITY_FOLDER_ITEM("duck"),
	COMMUNITY_FOLDER_ITEM("dragon_dead"),
	COMMUNITY_FOLDER_ITEM("hills"),
	COMMUNITY_FOLDER_ITEM("market_seller"),
	COMMUNITY_FOLDER_ITEM("offenburg"),
	COMMUNITY_FOLDER_ITEM("night"),
	COMMUNITY_FOLDER_ITEM("water_sand"),
	COMMUNITY_FOLDER_ITEM("early_sunset"),
];

const selectedKeyAtom = atom(0, "selectedKey")

const CarouselGallery = reatomComponent(({ ctx }) => {
	const selected = ctx.spy(selectedKeyAtom)

	return (
		<Carousel disableDrag={false} index={selected} onIndexChange={v => selectedKeyAtom(ctx, v)}>
			<CarouselContent>
				{commuinityGallery.map((image, i) => (
					<CarouselItem key={i} className="max-h-[720px] relative">
						<img
							draggable={false}
							loading="lazy"
							src={image}
							alt=""
							className="select-none w-full object-cover h-full"
							width={1920}
							height={1080}
						/>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselNavigation alwaysShow />
			<CarouselIndicator className="bottom-2" />
		</Carousel>
	)
})

const GalleryItemDialog = reatomComponent<{ image: string }>(({ ctx, image }) => {
	return (
		<MorphingDialog
			transition={{ type: 'spring', bounce: 0.05, duration: 0.25 }}
		>
			<MorphingDialogTrigger
				className='flex flex-col rounded-xl overflow-hidden hover:brightness-50'
			>
				<img
					src={image} loading="lazy" width={1280} alt="" height={720} className="w-auto object-cover"
				/>
			</MorphingDialogTrigger>
			<MorphingDialogContainer>
				<MorphingDialogContent
					className='flex flex-col gap-6 xl:flex-row rounded-lg p-0 max-h-[720px]
            max-w-[1280px] bg-neutral-950 pointer-events-auto relative w-full mx-2'
				>
					<CarouselGallery />
					<MorphingDialogClose />
				</MorphingDialogContent>
			</MorphingDialogContainer>
		</MorphingDialog>
	)
}, "GalleryItemDialog")

const CommunityGallery = reatomComponent(({ ctx }) => {
	return commuinityGallery.map((image, idx) => (
		<div key={idx} onClick={() => selectedKeyAtom(ctx, idx)}>
			<GalleryItemDialog image={image} />
		</div>
	))
}, "CommunityGallery")

const url = getStaticObject("arts", "adventure-in-blossom.jpg")

export default function GalleryPage() {
	return (
		<MainWrapperPage variant="with_section">
			<div
				className={sectionVariant({ className: "bg-bottom md:bg-center bg-cover" })}
				style={{ backgroundImage: `url(${url})` }}
			>
				<Overlay variant="default" />
				<WrapperTitle>
					<div className="flex flex-col gap-6 w-full lg:max-w-3xl items-start justify-center">
						<div className="flex flex-col gap-2 lg:max-w-3xl">
							<h1 className={sectionVariantChild().title({ className: "text-gold" })}>
								Галерея
							</h1>
							<Typography color="white" className={sectionVariantChild().subtitle()}>
								Здесь игровые фотокарточки
							</Typography>
						</div>
						<Link href="#commuinity" className={sectionVariantChild().action()}>
							<Button variant="minecraft" className="w-full px-6 py-0.5 gap-2">
								<Typography color="white" className="text-lg">
									К месту событий
								</Typography>
							</Button>
						</Link>
					</div>
				</WrapperTitle>
			</div>
			<div className="full-screen-section py-32">
				<div id="commuinity" className="flex flex-col gap-6 w-full responsive p-2">
					<div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-3 auto-rows-auto gap-2">
						<CommunityGallery />
					</div>
				</div>
			</div>
		</MainWrapperPage>
	)
}
