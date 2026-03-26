import { Link } from '@/shared/components/config/link';
import { getStaticObject } from '@/shared/lib/volume';
import { Fragment } from 'react';

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
      className={`sticky flex-col flex justify-center items-center gap-6 pt-10 pb-6`}
      style={{ backgroundSize: '160px', backgroundImage: `url(${bedrockImage})` }}
    >
      <div className="flex flex-col lg:flex-row justify-center items-center responsive mx-auto">
        <Link href="/" className="overflow-hidden">
          <img
            width={316}
            height={128}
            alt="Fasberry"
            src={getStaticObject("minecraft", "static/fasberry_logo.webp")}
            className="relative top-4 cursor-pointer"
          />
        </Link>
      </div>
      <div className="flex flex-col justify-center items-center lg:flex-row responsive gap-4 mx-auto">
        {FOOTER_LINKS.map(({ name, href }, idx) => (
          <Fragment key={href}>
            <Link href={`/info/${href}`}>
              <p className="text-white">
                {name}
              </p>
            </Link>
            {idx < FOOTER_LINKS.length - 1 &&
              <span className="text-white hidden lg:block mx-2">⏺</span>
            }
          </Fragment>
        ))}
      </div>
      <div className="flex flex-col justify-center gap-2 responsive mx-auto">
        <p className="text-center text-white">
          Fasberry Project. Оригинальные права принадлежат Mojang AB.
        </p>
      </div>
    </footer>
  );
};
