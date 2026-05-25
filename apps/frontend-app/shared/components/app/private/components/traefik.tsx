import Editor, { type OnMount } from "@monaco-editor/react";
import { reatomComponent, useUpdate } from "@reatom/npm-react";
import { Button } from "@/shared/ui/button";
import { IconCircleDashed } from "@tabler/icons-react";
import { configAtom, saveConfig, traefikConfig } from "../models/traefik.model";

export const ConfigEditor = reatomComponent(({ ctx }) => {
  useUpdate(traefikConfig, []);

  const config = ctx.spy(configAtom)
  const fetchStatus = ctx.spy(traefikConfig.statusesAtom)
  const fetchError = ctx.spy(traefikConfig.errorAtom)
  const savingStatus = ctx.spy(saveConfig.statusesAtom)
  const savingError = ctx.spy(saveConfig.errorAtom)
  const error = fetchError ?? savingError;

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveConfig(ctx);
    });
  };

  const isDisabled = fetchStatus.isPending || savingStatus.isPending;

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex items-center justify-start gap-4">
        <Button
          onClick={() => saveConfig(ctx)}
          disabled={isDisabled}
          variant="default"
          className="bg-white gap-2 text-black"
        >
          {savingStatus.isPending ? 'Сохранение' : 'Сохранить (Ctrl+S)'}
          {savingStatus.isPending && (
            <IconCircleDashed size={16} className="animate-spin duration-300" />
          )}
        </Button>
        {fetchStatus.isPending && <span className="text-white">Загрузка...</span>}
        {error && <span className="text-red">{error.message}</span>}
      </div>
      <div className="flex w-full h-dvh">
        <Editor
          defaultLanguage="yaml"
          theme="vs-dark"
          className="w-full h-full"
          value={config}
          onChange={(val) => configAtom(ctx, val ?? "")}
          onMount={handleEditorDidMount}
          options={{
            fontFamily: 'Consolas, monospace',
            fontSize: 13,
            renderLineHighlight: 'all',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}, "ConfigEditor")