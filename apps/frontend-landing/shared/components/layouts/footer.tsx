import { Link } from '@/shared/components/config/link';
import { getStaticObject } from '@/shared/lib/helpers';
import { For } from 'solid-js';

const FOOTER_LINKS = [
  { name: 'Конфиденциальность', href: '/privacy' },
  { name: 'Соглашение', href: '/terms' },
  { name: 'Контакты', href: '/contacts' },
  { name: 'Благодарности', href: '/credits' },
];

const bedrockImage = getStaticObject("minecraft", "static/bedrock.webp")

export const Footer = () => {
  return (
    <footer
      class={`sticky flex-col flex justify-center items-center gap-6 pt-10 pb-6`}
      style={{ "background-size": '160px', "background-image": `url(${bedrockImage})` }}
    >
      <div class="flex flex-col lg:flex-row justify-center items-center responsive mx-auto">
        <Link href="/" class="overflow-hidden">
          <img
            width={316}
            height={128}
            alt="Fasberry"
            src={getStaticObject("minecraft", "static/fasberry_logo.webp")}
            class="relative top-4"
          />
        </Link>
      </div>
      <div class="flex flex-col justify-center items-center lg:flex-row responsive gap-4 mx-auto">
        <For each={FOOTER_LINKS}>
          {(item, idx) => (
            <>
              <Link href={`/info/${item.href}`}>
                <p class="text-white">
                  {item.name}
                </p>
              </Link>
              {idx() < FOOTER_LINKS.length - 1 &&
                <span class="text-white hidden lg:block mx-2">⏺</span>
              }
            </>
          )}
        </For>
      </div>
      <div class="flex flex-col justify-center gap-2 responsive mx-auto">
        <p class="text-center text-white">
          Fasberry Project. Оригинальные права принадлежат Mojang AB.
        </p>
      </div>
    </footer>
  );
};
