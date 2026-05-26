import { Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { tv } from "tailwind-variants"
import { scrollableVariant } from "@/shared/consts/style-variants"
import { reatomComponent } from "@reatom/npm-react"
import { IconArrowBackUp, IconArrowForwardUp, IconPictureInPicture, IconSettings } from "@tabler/icons-react"
import { Menu } from '@ark-ui/react/menu'
import { menuArrowTipVariant, menuArrowVariant, menuContentVariant } from "@/shared/ui/menu"
import { EDITOR_DEFAULT_CONTENT, editorBar, editorBarState, editorExtensions, editorSelectors, editorState } from "./editor.model"

const controlVariant = tv({
  base: `
    shrink-0 data-[state=active]:bg-neutral-600 [&:not([data-state])]:bg-neutral-800 data-[state=inactive]:bg-neutral-800
    disabled:opacity-60 disabled:pointer-events-none font-semibold h-7 min-w-7 px-2 rounded-md text-nowrap
  `
})

export const EditorMenuBar = reatomComponent<{ editor: Editor }>(({ ctx, editor }) => {
  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => editorSelectors(editor)
  })

  const isTable = ctx.spy(editorBarState.isTable);
  const isLink = ctx.spy(editorBarState.isLink);

  return (
    <>
      <div
        className={scrollableVariant({
          className: "flex flex-wrap pb-2 rounded-lg scrollbar-h-2 items-center w-full gap-1",
          variant: "hovered"
        })}
      >
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editorState.canUndo}
          className={controlVariant()}
        >
          <IconArrowBackUp />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editorState.canRedo}
          className={controlVariant()}
        >
          <IconArrowForwardUp />
        </button>
        <div>
          <Menu.Root>
            <Menu.Trigger asChild>
              <button className={controlVariant()} data-state={"inactive"}>
                <IconSettings />
              </button>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content className={menuContentVariant()}>
                <Menu.Arrow className={menuArrowVariant()}>
                  <Menu.ArrowTip className={menuArrowTipVariant()} />
                </Menu.Arrow>
                <Menu.Item
                  value="clear_marks"
                  className={controlVariant()}
                  onClick={() => editor.chain().focus().unsetAllMarks().run()}
                >
                  Clear marks
                </Menu.Item>
                <Menu.Item
                  value="clear_nodes"
                  className={controlVariant()}
                  onClick={() => editor.chain().focus().clearNodes().run()}
                >
                  Clear nodes
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root >
        </div>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editorState.canBold}
          data-state={editorState.isBold ? "active" : "inactive"}
          className={controlVariant()}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editorState.canItalic}
          data-state={editorState.isItalic ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editorState.canStrike}
          data-state={editorState.isStrike ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editorState.canCode}
          data-state={editorState.isCode ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          C
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          data-state={editorState.isParagraph ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          P
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-state={editorState.isHeading1 ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-state={editorState.isHeading2 ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          data-state={editorState.isHeading3 ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          data-state={editorState.isHeading4 ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          H4
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
          data-state={editorState.isHeading5 ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          H5
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
          data-state={editorState.isHeading6 ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          H6
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-state={editorState.isBulletList ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          BL
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-state={editorState.isOrderedList ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          OL
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          data-state={editorState.isCodeBlock ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          CB
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-state={editorState.isBlockquote ? 'active' : 'inactive'}
          className={controlVariant()}
        >
          BQ
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={controlVariant()}
        >
          HR
        </button>
        <button
          onClick={() => editor.chain().focus().setHardBreak().run()}
          className={controlVariant()}
        >
          HB
        </button>
        <div
          className={controlVariant()}
          onClick={() => editorBar.toggleLink(ctx)}
          data-state={isLink ? 'active' : 'inactive'}
        >
          Link
        </div>
        <button
          className={controlVariant()}
          onClick={() => editorBar.addImage(ctx, editor)}
          data-state={isLink ? 'active' : 'inactive'}
        >
          <IconPictureInPicture />
        </button>
        {isLink && (
          <>
            <button
              onClick={() => editorBar.setLink(ctx, editor)}
              data-state={editorState.isLink ? 'active' : 'inactive'}
              className={controlVariant()}
            >
              Set link
            </button>
            <button
              onClick={() => editor.chain().focus().unsetLink().run()}
              disabled={!editorState.isLink}
              className={controlVariant()}
            >
              Unset link
            </button>
          </>
        )}
        <div
          className={controlVariant()}
          onClick={() => editorBar.toggleTable(ctx)}
          data-state={isTable ? 'active' : 'inactive'}
        >
          Table
        </div>
        {isTable && (
          <div className="flex items-center gap-1 w-full">
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              Insert table
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
              Add column before
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              Add column after
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              Delete column
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
              Add row before
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              Add row after
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              Delete row
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              Delete table
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().mergeCells().run()}
            >
              Merge cells
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().splitCell().run()}
            >
              Split cell
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
            >
              Toggle header column
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
              Toggle header row
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().toggleHeaderCell().run()}
            >
              Toggle header cell
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().mergeOrSplit().run()}
            >
              Merge or split
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().setCellAttribute('colspan', 2).run()}
            >
              Set cell attribute
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().fixTables().run()}
            >
              Fix tables
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().goToNextCell().run()}
            >
              Go to next cell
            </button>
            <button
              className={controlVariant()}
              onClick={() => editor.chain().focus().goToPreviousCell().run()}
            >
              Go to previous cell
            </button>
          </div>
        )}
      </div>
    </>
  )
}, "EditorMenuBar")

export const EditorTest = reatomComponent(({ ctx }) => {
  const editor = useEditor({
    extensions: editorExtensions,
    content: EDITOR_DEFAULT_CONTENT,
    onUpdate: ({ editor }) => {
      let value = editor.getHTML();
      editorState.content(ctx, value)
    },
  })

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <EditorMenuBar editor={editor} />
      <EditorContent editor={editor} />
      <button onClick={() => console.log(editor.getJSON())}>
        get JSON
      </button>
    </div>
  )
}, "EditorPreview")
