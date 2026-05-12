import StarterKit from "@tiptap/starter-kit"
import { TextStyleKit } from "@tiptap/extension-text-style"
import { Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react"
import { tv } from "tailwind-variants"
import { scrollableVariant } from "@/shared/consts/style-variants"
import { TableKit } from '@tiptap/extension-table'
import { reatomComponent } from "@reatom/npm-react"
import { action, atom } from "@reatom/framework"
import { withAssign } from "@reatom/framework"
import { IconArrowBackUp, IconArrowForwardUp, IconArrowLeft, IconArrowRight, IconPictureInPicture, IconSettings } from "@tabler/icons-react"
import Image from '@tiptap/extension-image'
import { env } from "@/shared/env"
import { Menu } from '@ark-ui/react/menu'

export const editorExtensions = [
  TextStyleKit,
  Image.configure({
    resize: {
      enabled: true,
      directions: ['top', 'bottom', 'left', 'right'],
      minWidth: 50,
      minHeight: 50,
      alwaysPreserveAspectRatio: true,
    }
  }),
  TableKit.configure({
    table: { resizable: true },
  }),
  StarterKit.configure({
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      protocols: ['http', 'https'],
      isAllowedUri: (url, ctx) => {
        try {
          const parsedUrl = url.includes(':')
            ? new URL(url)
            : new URL(`${ctx.defaultProtocol}://${url}`)

          if (!ctx.defaultValidate(parsedUrl.href)) {
            return false
          }

          const disallowedProtocols = ['ftp', 'file', 'mailto']
          const protocol = parsedUrl.protocol.replace(':', '')

          if (disallowedProtocols.includes(protocol)) {
            return false
          }

          const allowedProtocols = ctx.protocols.map(p => (typeof p === 'string' ? p : p.scheme))

          if (!allowedProtocols.includes(protocol)) {
            return false
          }

          const domain = parsedUrl.hostname;

          if (!isHostnameAllowed(domain)) {
            return false;
          }

          return true
        } catch {
          return false
        }
      },
      shouldAutoLink: url => {
        try {
          const parsedUrl = url.includes(':')
            ? new URL(url)
            : new URL(`https://${url}`);

          const domain = parsedUrl.hostname;

          return isHostnameAllowed(domain)
        } catch {
          return false
        }
      },
    }
  })
]

const controlVariant = tv({
  base: `
    shrink-0 data-[state=active]:bg-neutral-600 [&:not([data-state])]:bg-neutral-800 data-[state=inactive]:bg-neutral-800
    disabled:opacity-60 disabled:pointer-events-none font-semibold h-7 min-w-7 px-2 rounded-md text-nowrap
  `
})

const isTableAtom = atom(false)
const isLinkAtom = atom(false)

const bar = atom(null, "bar").pipe(
  withAssign((ctx, name) => ({
    toggleLink: action((ctx) => {
      isLinkAtom(ctx, (state) => !state)
    }),
    toggleTable: action((ctx) => {
      isTableAtom(ctx, (state) => !state)
    })
  }))
)

export const EditorMenuBar = reatomComponent<{ editor: Editor }>(({ ctx, editor }) => {
  const editorState = useEditorState({
    editor,
    selector: ctx => {
      return {
        isBold: ctx.editor.isActive('bold') ?? false,
        canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
        isItalic: ctx.editor.isActive('italic') ?? false,
        canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
        isStrike: ctx.editor.isActive('strike') ?? false,
        canStrike: ctx.editor.can().chain().toggleStrike().run() ?? false,
        isCode: ctx.editor.isActive('code') ?? false,
        canCode: ctx.editor.can().chain().toggleCode().run() ?? false,
        canClearMarks: ctx.editor.can().chain().unsetAllMarks().run() ?? false,
        isParagraph: ctx.editor.isActive('paragraph') ?? false,
        isHeading1: ctx.editor.isActive('heading', { level: 1 }) ?? false,
        isHeading2: ctx.editor.isActive('heading', { level: 2 }) ?? false,
        isHeading3: ctx.editor.isActive('heading', { level: 3 }) ?? false,
        isHeading4: ctx.editor.isActive('heading', { level: 4 }) ?? false,
        isHeading5: ctx.editor.isActive('heading', { level: 5 }) ?? false,
        isHeading6: ctx.editor.isActive('heading', { level: 6 }) ?? false,
        isBulletList: ctx.editor.isActive('bulletList') ?? false,
        isOrderedList: ctx.editor.isActive('orderedList') ?? false,
        isCodeBlock: ctx.editor.isActive('codeBlock') ?? false,
        isBlockquote: ctx.editor.isActive('blockquote') ?? false,
        canUndo: ctx.editor.can().chain().undo().run() ?? false,
        canRedo: ctx.editor.can().chain().redo().run() ?? false,
        isLink: ctx.editor.isActive('link'),
      }
    },
  })

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    try {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } catch (e) {
      if (e instanceof Error) {
        alert(e.message)
      }
    }
  }

  const isTable = ctx.spy(isTableAtom);
  const isLink = ctx.spy(isLinkAtom);

  const addImage = () => {
    const url = window.prompt('URL')

    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

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
              <Menu.Content>
                <Menu.Arrow>
                  <Menu.ArrowTip />
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
          onClick={() => bar.toggleLink(ctx)}
          data-state={isLink ? 'active' : 'inactive'}
        >
          Link
        </div>
        <button
          className={controlVariant()}
          onClick={addImage}
          data-state={isLink ? 'active' : 'inactive'}
        >
          <IconPictureInPicture />
        </button>
        {isLink && (
          <>
            <button
              onClick={setLink}
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
          onClick={() => bar.toggleTable(ctx)}
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

const ALLOWED_DOMAINS = [
  'google.com',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'mozilla.org',
  'apple.com',
  'amazon.com',
  'linkedin.com',
  `${env.VITE_MAIN_DOMAIN}`,
  'discord.gg'
];

const domainPattern = ALLOWED_DOMAINS
  .map(d => d.replace(/\./g, '\\.'))
  .join('|');

function isHostnameAllowed(rawHostname: string) {
  if (!rawHostname || typeof rawHostname !== 'string') return false;

  const hostname = rawHostname.trim().toLowerCase();
  return ALLOWED_HOSTNAME_RE.test(hostname);
}

const ALLOWED_HOSTNAME_RE = new RegExp(
  `^(?:[a-z0-9-]+\\.)*(?:${domainPattern})$`,
  'i'
);


const content = atom(`<h2>Hi there</h2>`)

export const EditorTest = reatomComponent(({ ctx }) => {
  const editor = useEditor({
    extensions: editorExtensions,
    content: `<h2>Hi there</h2>`,
    onUpdate: ({ editor }) => {
      let value = editor.getHTML();

      if (import.meta.env.DEV) {
        value = value.replaceAll("https://volume.fasberry.fun", "http://127.0.0.1:9000")
      }

      content(ctx, value)
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