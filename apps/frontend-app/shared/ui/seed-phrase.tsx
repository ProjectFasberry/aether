import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { type ComponentPropsWithoutRef, createContext, type PropsWithChildren, type ReactNode, useContext, useRef } from 'react';
import { cn } from '../lib/cn';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

type SeedPhraseContextType = {
  words: string[];
  isEditable?: boolean;
  errors?: Record<number, string>;
  onUpdateWord?: (idx: number, value: string) => void;
  onValidateWord?: (idx: number) => void;
  isHidden?: boolean;
};

type SeedPhraseProps = SeedPhraseContextType & {
  children: ReactNode;
};

const seedPhraseCtx = createContext<SeedPhraseContextType | null>(null);

const useSeedPhrase = () => {
  const context = useContext(seedPhraseCtx);
  if (!context) {
    throw new Error('SeedPhrase components must be used within a <SeedPhrase />');
  }
  return context;
};

type SeedPhraseHeaderProps = PropsWithChildren & {
  withChangeVisibility?: boolean,
  onChangeVisibilityStatus?: (isHidden: boolean) => void;
}

const SeedPhraseHeader = ({
  withChangeVisibility = true,
  onChangeVisibilityStatus,
  children
}: SeedPhraseHeaderProps) => {
  const { words, isHidden } = useSeedPhrase();
  const isOneWordFilled = withChangeVisibility ? words.some((w) => w.length >= 1) : false;

  return (
    <div className="flex justify-between w-full items-start">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-white">
          Секретная фраза
        </h2>
        {children}
      </div>
      {withChangeVisibility && (
        <Button
          type="button"
          background='default'
          disabled={!isOneWordFilled}
          onClick={() => onChangeVisibilityStatus?.(!isHidden)}
          className="p-2 aspect-square"
        >
          {isHidden ? <IconEye size={16} /> : <IconEyeOff size={16} />}
        </Button>
      )}
    </div>
  )
}

const SeedPhrase = ({
  children,
  words,
  isEditable = true,
  errors = {},
  onUpdateWord,
  onValidateWord,
  isHidden = true,
  className
}: SeedPhraseProps & ComponentPropsWithoutRef<"div">) => {
  return (
    <seedPhraseCtx.Provider
      value={{
        words,
        isEditable,
        errors,
        onUpdateWord,
        onValidateWord,
        isHidden
      }}
    >
      <div className={cn("flex flex-col w-full", className)}>
        {children}
      </div>
    </seedPhraseCtx.Provider>
  );
};

const SeedPhraseBody = () => {
  const { words, isHidden, onUpdateWord, errors = {}, onValidateWord, isEditable } = useSeedPhrase()
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const next = inputsRef.current[index + 1];
      if (next) next.focus();
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 w-full gap-4">
      {words.map((word, idx) => (
        <div key={idx} className="relative">
          <div className="flex items-center rounded-lg gap-3 border border-neutral-700 focus-within:border-neutral-500">
            <span className="pl-3 text-neutral-500 text-xs font-mono w-10 max-w-10 overflow-hidden">
              {idx + 1}.
            </span>
            <Input
              ref={(el) => {
                inputsRef.current[idx] = el
              }}
              type={isHidden ? 'password' : 'text'}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              value={word}
              onChange={(e) => {
                if (!isEditable) return;
                onUpdateWord?.(idx, e.target.value);
              }}
              onBlur={() => {
                if (!isEditable) return;
                onValidateWord?.(idx);
              }}
              placeholder="---"
              className="w-full pl-0 focus-within:ring-transparent bg-transparent outline-none"
            />
          </div>
          {errors[idx] && (
            <span className="absolute left-0 text-[10px] text-red">
              {errors[idx]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

const SeedPhraseFooter = ({ children }: PropsWithChildren) => {
  return <div className="flex flex-col items-center gap-2 w-full">{children}</div>
}

export {
  SeedPhrase,
  SeedPhraseHeader,
  SeedPhraseBody,
  SeedPhraseFooter
}