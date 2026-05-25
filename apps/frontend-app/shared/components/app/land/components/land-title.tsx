import { useMemo } from "react";

const COLOR_MAP: Record<string, string> = {
  '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
  '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
  '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
  'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF',
};

const FORMAT_MAP: Record<string, string> = {
  'l': 'formatted-text-bold',
  'o': 'formatted-text-italic',
  'n': 'formatted-text-underline',
  'm': 'formatted-text-strikethrough',
};

const initial: {
  color: string | null,
  bold: boolean,
  italic: boolean,
  underline: boolean,
  strikethrough: boolean
} = {
  color: null,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
}

const FORMAT_CHARACTERS = ['&', '§'];

interface FormattedTextProps {
  text: string;
  as?: 'p' | 'span' | 'div';
  className?: string;
}

/**
 * &<0-9a-f> - цвет
 * &l - жирный
 * &o - курсив
 * &n - подчеркнутый
 * &m - зачеркнутый
 * &r - сброс всех стилей
 */
export const FormattedText = ({
  text, as: Wrapper = 'span', className,
}: FormattedTextProps) => {
  const parsedElements = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let currentState = initial
    let currentText = '';

    const pushPart = () => {
      if (currentText.length > 0) {
        const classNames = [
          currentState.bold ? FORMAT_MAP['l'] : '',
          currentState.italic ? FORMAT_MAP['o'] : '',
          currentState.underline ? FORMAT_MAP['n'] : '',
          currentState.strikethrough ? FORMAT_MAP['m'] : '',
        ]
          .filter(Boolean)
          .join(' ');

        parts.push(
          <span
            key={parts.length}
            style={{ color: currentState.color ?? 'inherit' }}
            className={classNames}
          >
            {currentText}
          </span>
        );
      }
      currentText = '';
    };

    for (let i = 0; i < text.length; i++) {
      if (FORMAT_CHARACTERS.includes(text[i]) && i + 1 < text.length) {
        const code = text[i + 1].toLowerCase();

        const isColorCode = code in COLOR_MAP;
        const isFormatCode = code in FORMAT_MAP;
        const isResetCode = code === 'r';

        if (isColorCode || isFormatCode || isResetCode) {
          pushPart();

          if (isColorCode) {
            currentState.color = COLOR_MAP[code];
          } else if (isFormatCode) {
            if (code === 'l') currentState.bold = true;
            if (code === 'o') currentState.italic = true;
            if (code === 'n') currentState.underline = true;
            if (code === 'm') currentState.strikethrough = true;
          } else if (isResetCode) {
            currentState = initial
          }

          i++;
          continue;
        }
      }

      currentText += text[i];
    }

    pushPart();

    return parts;
  }, [text]);

  return (
    <Wrapper className={className}>
      {parsedElements}
    </Wrapper>
  );
};