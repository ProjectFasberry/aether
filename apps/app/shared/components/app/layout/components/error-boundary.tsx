import { Button } from "@repo/ui/button";
import { type PropsWithChildren } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col gap-2 h-dvh responsive mx-auto w-full items-center justify-center">
      <div className="flex flex-col w-full items-center justify-center">
        <p className="text-lg font-semibold">Произошла ошибка в работе приложения</p>
        <span>Мы уже работаем над исправлением!</span>
      </div>
      <Button
        background='white'
        className="font-semibold"
        onClick={() => resetErrorBoundary()}
      >
        Обновить
      </Button>
      {import.meta.env.DEV && <pre className='text-red text-sm truncate text-wrap'>{error.message}</pre>}
    </div>
  );
}

function logError(error: Error, info: React.ErrorInfo) {
  console.error(error)
};

export const ErrorBoundaryProvider = ({ children }: PropsWithChildren) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
    >
      {children}
    </ErrorBoundary>
  )
}