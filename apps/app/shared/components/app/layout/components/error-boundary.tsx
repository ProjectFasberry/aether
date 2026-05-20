import { Button } from "@/shared/ui/button";
import { IconMoodWrrrFilled } from "@tabler/icons-react";
import { type PropsWithChildren } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { errorBoundary } from "../models/error.model";

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="flex flex-col gap-4 h-dvh responsive mx-auto w-full items-center justify-center">
      <IconMoodWrrrFilled className="w-24 h-24" />
      <div className="flex flex-col w-full gap-2 items-center justify-center">
        <p className="text-lg sm:text-xl text-center leading-5 font-semibold">
          Произошла ошибка в работе приложения
        </p>
        <span className="text-neutral-400 text-sm sm:text-base">
          Мы уже работаем над исправлением!
        </span>
      </div>
      <Button
        background='white'
        className="font-semibold"
        onClick={() => resetErrorBoundary()}
      >
        Обновить
      </Button>
      {import.meta.env.DEV && (
        <div className="flex flex-col mt-2 gap-1 w-full">
          <p className="text-sm leading-4 text-neutral-400">Debug:</p>
          <pre className='text-red p-2 text-sm truncate text-wrap'>
            <code>{error.message}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export const ErrorBoundaryProvider = ({ children }: PropsWithChildren) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(e, info) => errorBoundary.log(e, info)}
    >
      {children}
    </ErrorBoundary >
  )
}
