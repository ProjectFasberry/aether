import { type ComponentProps, createMemo, splitProps } from 'solid-js';
import { type SpritePrepareConfig, sprites, type SpritesMeta } from '../sprite.gen';

export interface IconProps extends ComponentProps<'svg'> {
  /** Icon name, e.g. "common:close" */
  name: IconName;
  /**
   * Inverts main scaling axis.
   * @default false
   */
  invert?: boolean;
}

export type IconName = {
  [Key in keyof SpritesMeta]: `${Key & string}:${SpritesMeta[Key] & string}`;
}[keyof SpritesMeta];

export const Icon = (props: IconProps) => {
  const [local, remainingProps] = splitProps(props, ['name', 'class', 'classList', 'invert']);

  const iconMeta = createMemo(() => getIconMeta(local.name));

  const scaleX = createMemo(() => iconMeta().symbol.width > iconMeta().symbol.height);
  const scaleY = createMemo(() => iconMeta().symbol.width < iconMeta().symbol.height);

  return (
    <svg
      classList={{
        'icon-x': local.invert ? scaleY() : scaleX(),
        'icon-y': local.invert ? scaleX() : scaleY(),
        icon: iconMeta().symbol.width === iconMeta().symbol.height,
        ...local.classList,
        [local.class || '']: !!local.class,
      }}
      viewBox={iconMeta().symbol.viewBox}
      focusable="false"
      aria-hidden="true"
      {...remainingProps}
    >
      <use href={iconMeta().href} />
    </svg>
  );
};

const getIconMeta = (name: IconName) => {
  const [spriteName, iconName] = name.split(':');
  const item = sprites.experimental_get(spriteName!, iconName!, spritesConfig);

  if (!item) {
    console.error(`Icon "${name}" is not found in "${spriteName}" sprite`);
    return sprites.experimental_get('general', 'help', spritesConfig)!;
  }
  return item;
};

const spritesConfig: SpritePrepareConfig = {
  baseUrl: '/sprites/'
};
