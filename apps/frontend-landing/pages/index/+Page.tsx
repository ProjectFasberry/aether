import { Link } from "@/shared/components/config/link"
import { MainWrapperPage } from "@repo/ui/main-wrapper";
import { Button } from "@repo/ui/button";
import { Typography } from "@repo/ui/typography";
import { tv } from "tailwind-variants";
import { getStaticObject } from "@/shared/lib/volume";
import { Carousel, CarouselContent, CarouselIndicator, CarouselItem } from '@repo/ui/carousel';
import { atom } from '@reatom/core';
import { reatomComponent } from '@reatom/npm-react';
import { action } from "@reatom/core";
import { Fragment } from "react/jsx-runtime";
import { sectionVariant, sectionVariantChild } from "@/shared/styles/variants";
import { usePageContext } from "vike-react/usePageContext";
import { translate } from "@/shared/locales/helpers";
import { withAssign } from "@reatom/framework";
import { LayoutSettings, weatherAtom } from "@/shared/components/layouts/settings";

const introImage = getStaticObject("arts", "server-status-widget.webp")
const shareImage = getStaticObject("arts", "bzzvanet-.jpg")

const SPAWN_IMAGES = [
	getStaticObject("images", "offenburg-1.webp"),
	getStaticObject("images", "offenburg-2.webp"),
	getStaticObject("images", "offenburg-3.webp"),
	getStaticObject("images", "offenburg-4.webp"),
	getStaticObject("images", "offenburg-5.webp"),
]

const carouselSelectedKeyAtom = atom(0, "carouselSelectedKey")

const SpawnCarousel = reatomComponent(({ ctx }) => {
	const selected = ctx.spy(carouselSelectedKeyAtom)

	return (
		<Carousel
			className="z-20 w-full h-full"
			index={selected}
			onIndexChange={v => carouselSelectedKeyAtom(ctx, v)}
		>
			<CarouselIndicator className='bottom-8' />
			<CarouselContent>
				{SPAWN_IMAGES.map((image, idx) => (
					<CarouselItem key={idx} className="w-full h-full">
						<img
							src={image}
							draggable={false}
							className="w-full select-none brightness-75 h-full rounded-xl object-cover"
							width={1920}
							height={1080}
							loading="lazy"
							alt=""
						/>
					</CarouselItem>
				))}
			</CarouselContent>
		</Carousel>
	)
}, "SpawnCarousel")

const IDEAS = [
	{
		title: "Геймплей",
		image: getStaticObject("images", "steve-alex.webp"),
		description: "Выживайте, создавайте поселения и города, общайтесь с игроками, создавайте себя",
		type: "full"
	},
	{
		title: "Персонализация",
		image: getStaticObject("images", "wild-west.webp"),
		link: {
			title: "Узнать больше",
			href: "/wiki/profile"
		},
		description: "Создайте себе свой стиль: новые эмоции, частицы и питомцы",
		type: "full"
	},
	{
		title: "Квесты",
		image: getStaticObject("images", "casino-barebones.webp"),
		link: {
			title: "Узнать больше",
			href: "/wiki/quests"
		},
		description: "Квесты - неотъемлемая часть геймплея, если вы хотите быстро заработать",
		type: "full"
	},
	{
		title: "Ресурспак",
		image: getStaticObject("images", "custom-armor.webp"),
		link: {
			title: "Узнать больше",
			href: "/wiki/resourcepack"
		},
		description: "Ресурспак добавляет новые предметы: броню, инструменты, оружие и мебель.",
		type: "module"
	},
	{
		title: "Эмоции",
		image: getStaticObject("images", "emotes-preview.webp"),
		link: {
			title: "Узнать больше",
			href: "/wiki/emotes"
		},
		description: "Сервер поддерживает кастомные движения игрока",
		type: "module"
	}
]

const selectedKeyAtom = atom(0, "selectedKey").pipe(
	withAssign((atom, name) => ({
		prev: action((ctx) => {
			const target = ctx.get(atom)

			if (target === 0) {
				atom(ctx, IDEAS.length - 1)
			} else {
				atom(ctx, target - 1);
			}
		}, `${name}.prev`),
		next: action((ctx) => {
			const target = ctx.get(atom)

			if (target === IDEAS.length - 1) {
				atom(ctx, 0);
			} else {
				atom(ctx, target + 1);
			}
		}, `${name}.next`)
	}))
)

const prevImg = getStaticObject("minecraft/icons", "large-arrow-left-hover.png")
const nextImg = getStaticObject("minecraft/icons", "large-arrow-right-hover.png")

const IdeaMainNavigation = reatomComponent<{ type: "next" | "prev" }>(({ ctx, type }) => {
	return (
		<div
			className="flex items-center justify-center gap-4 h-10 aspect-square w-6 cursor-pointer"
			onClick={() => selectedKeyAtom[type](ctx)}
		>
			<img
				src={type === 'prev' ? prevImg : nextImg}
				width={20}
				loading="lazy"
				height={20}
				alt=""
			/>
		</div>
	)
}, `IdeaMainNavigation`)

const navigationBadge = tv({
	base: `tr border-2 justify-center border-neutral-900 cursor-pointer duration-300 px-4 py-2`,
	variants: {
		variant: { unselected: "text-neutral-50", selected: "", }
	}
})

const previewCard = tv({
	base: `flex flex-col sm:flex-row relative sm:items-center w-full gap-2 lg:w-2/3
		overflow-hidden p-4 sm:p-6 xl:p-14 h-[320px] lg:h-[460px] lg:max-w-full justify-start rounded-xl`,
	variants: {
		variant: { module: `bg-neutral-300`, full: `` }
	}
})

const previewChildCard = tv({
	base: `flex z-[3] flex-col relative `,
	variants: {
		variant: { module: `sm:w-2/4 w-full`, full: `sm:w-2/3 w-full` }
	}
})


const previewTitle = tv({
	base: `mb-2 sm:mb-4 text-xl sm:text-3xl lg:text-4xl`,
	variants: {
		variant: { full: `text-neutral-50`, module: `text-neutral-900` }
	}
})

const previewDescription = tv({
	base: `text-base sm:text-lg lg:text-xl`,
	variants: {
		variant: { full: `text-neutral-200`, module: `text-neutral-900` }
	}
})

const previewLink = tv({
	base: `text-base sm:text-lg`,
	variants: {
		variant: { full: `text-neutral-300`, module: `text-neutral-700` }
	}
})

const IdeaPreviewCard = reatomComponent(({ ctx }) => {
	const selected = ctx.spy(selectedKeyAtom)

	const { type, image, link, title, description } = IDEAS[selected]

	const variant = type as "module" | "full"

	return (
		<div className={previewCard({ variant })}>
			{type === 'full' && (
				<div className="absolute top-0 bottom-0 right-0 left-0 w-full h-full">
					<div className="absolute left-0 h-full w-full z-[2] bg-gradient-to-r from-neutral-900/60 via-transparent to-transparent" />
					<img
						src={image}
						loading="lazy"
						alt=""
						width={1000}
						height={1000}
						className="brightness-[55%] w-full h-full object-cover"
					/>
				</div>
			)}
			<div className={previewChildCard({ variant })}>
				<Typography className={previewTitle({ variant })}>
					{title}
				</Typography>
				<Typography className={previewDescription({ variant })}>
					{description}
				</Typography>
				{link && (
					<Link href={link.href} className="w-fit mt-2 sm:mt-4 underline underline-offset-8">
						<Typography className={previewLink({ variant })}>
							{link.title}
						</Typography>
					</Link>
				)}
			</div>
			{type === 'module' && (
				<div className="flex items-center justify-center w-full sm:w-2/4 h-full">
					<img
						src={image}
						loading="lazy"
						alt=""
						width={1000}
						height={1000}
						className="w-full h-full object-cover rounded-xl"
					/>
				</div>
			)}
		</div>
	)
}, "IdeaPreviewCard")

const getIsActiveAtom = (id: number) => atom((ctx) => ctx.spy(selectedKeyAtom) === id, "getIsActive")

const Item = reatomComponent<{ idx: number, title: string }>(({ ctx, idx, title }) => {
	return (
		<div
			data-state={ctx.spy(getIsActiveAtom(idx)) ? "active" : "inactive"}
			onClick={() => selectedKeyAtom(ctx, idx)}
			className={navigationBadge()}
		>
			<Typography className="truncate">{title}</Typography>
		</div>
	)
})

const CONTACTS_LIST = [
	{ name: "Discord", href: "https://discord.gg/vnqfVX4frH" },
	{ name: "Telegram", href: "https://t.me/fasberry" },
];

const useTranslate = () => {
	const pageContext = usePageContext()

	const handle = (target: string) => {
		return translate(pageContext, target)
	}

	return { translate: handle }
}

const Weather = reatomComponent(({ ctx }) => {
	const data = ctx.spy(weatherAtom);

	return (
		<div className={`weather ${data} absolute z-[1] w-full h-full top-0 right-0 left-0`} />
	)
})

export default function Page() {
	const { translate } = useTranslate()

	return (
		<MainWrapperPage variant="with_section">
			<LayoutSettings />
			<div id="title" className={sectionVariant()}>
				<div className="absolute top-0 right-0 left-0 overflow-hidden h-full">
					<div
						className="w-full h-full absolute top-0 right-0 brightness-[55%] left-0 bg-no-repeat bg-center bg-cover"
						style={{ backgroundImage: `url('${introImage}')` }}
					/>
					<Weather />
				</div>
				<div className="flex items-center justify-start responsive z-1 mx-auto h-full">
					<div
						className="flex flex-col z-[2] w-full px-2 sm:px-0 lg:w-[50%] gap-2 sm:gap-4 justify-start items-start rounded-xl py-4 lg:py-6"
					>
						<div className="flex flex-col items-start justify-center w-full">
							<h1 className={sectionVariantChild().title({ className: "text-pink-300" })}>
								Fasberry Project
							</h1>
							<h2 className={sectionVariantChild().subtitle({ className: "text-white mb-4" })}>
								{translate("welcome.subtitle")}
							</h2>
							<h3 className={sectionVariantChild().description({ className: "text-white text-shadow-lg" })}>
								{translate("welcome.description")}
							</h3>
						</div>
						<Link href="/start" className={sectionVariantChild().action()}>
							<Button variant="minecraft" className="w-full py-1 sm:py-1.5" >
								<Typography color="white" className="text-nowrap text-base sm:text-xl text-shadow-xl">
									{translate("welcome.actionText")}
								</Typography>
							</Button>
						</Link>
					</div>
				</div>
			</div>
			<div id="features" className={sectionVariant()}>
				<div className="flex flex-col items-center mx-auto responsive gap-6 justify-center select-none relative">
					<Typography color="white" className="text-xl text-center sm:text-3xl lg:text-4xl">
						{translate("features.title")}
					</Typography>
					<div className="flex items-center justify-center w-full gap-1 sm:gap-6 md:gap-4">
						<IdeaMainNavigation type="prev" />
						<div
							className="flex rounded-md overflow-x-auto items-center justify-start w-fit
								scrollbar scrollbar-thumb-rounded-xl scrollbar-h-0 scrollbar-thumb-neutral-900
							"
						>
							{IDEAS.map((preview, idx) => (
								<Fragment key={preview.title}>
									<Item idx={idx} title={preview.title} />
									{(idx + 1) < IDEAS.length && <hr className="w-4 h-[1px] border-2 border-neutral-900" />}
								</Fragment>
							))}
						</div>
						<IdeaMainNavigation type="next" />
					</div>
					<IdeaPreviewCard />
				</div>
			</div>
			<div id="spawn" className={sectionVariant()}>
				<div className="flex flex-col items-center z-1 mx-auto responsive justify-center relative">
					<div className="flex flex-col gap-4 items-center justify-center h-full sm:overflow-hidden relative w-full">
						<div className="rounded-xl h-[60%] overflow-hidden">
							<SpawnCarousel />
						</div>
						<div
							className="flex flex-col bg-neutral-700/60 backdrop-blur-sm p-2 rounded-xl w-full gap-2 z-[21] lg:w-[60%] xl:w-[70%]"
						>
							<Typography color="white" className="text-base sm:text-xl leading-6 text-center">
								Спавн сервера
							</Typography>
							<Typography color="gray" className="!leading-5 text-sm sm:text-base text-center">
								Спавном сервера является город Оффенбург, в котором можно найти много интересных и даже секретных мест,
								персонажей, с которыми можно пообщаться и прочие активности.
							</Typography>
						</div>
					</div>
				</div>
			</div>
			<div id="share" className={sectionVariant()}>
				<div className="absolute top-0 right-0 left-0 overflow-hidden h-full">
					<div
						className="w-full h-full absolute top-0 right-0 brightness-[55%] left-0 bg-no-repeat bg-center bg-cover"
						style={{ backgroundImage: `url('${shareImage}')` }}
					/>
				</div>
				<div className="flex flex-col items-center z-1 responsive gap-12 justify-center select-none relative">
					<Typography color="white" className="text-center text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl">
						{translate("contacts.title")}
					</Typography>
					<div className="flex flex-col gap-4 justify-center items-center lg:w-1/4 *:w-full w-full h-full">
						{CONTACTS_LIST.map(item => (
							<a key={item.name} href={item.href} target="_blank" rel="noreferrer">
								<Button key={item.name} variant="minecraft" className="w-full py-0.5">
									<Typography className="text-white text-lg">
										{translate("contacts.itemTitle")} {item.name}
									</Typography>
								</Button>
							</a>
						))}
					</div>
				</div>
			</div>
		</MainWrapperPage>
	)
}
