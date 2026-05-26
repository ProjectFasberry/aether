import { TableKit } from '@tiptap/extension-table'
import { TextStyleKit } from "@tiptap/extension-text-style"
import Image from '@tiptap/extension-image'
import StarterKit from "@tiptap/starter-kit"
import { env } from '@/shared/env';
import { action, atom, withAssign } from '@reatom/framework';
import type { Editor, EditorStateSnapshot } from '@tiptap/react';

export const DEFAULT_SELECTORS = {
  isBold: false,
  canBold: false,
  isItalic: false,
  canItalic: false,
  isStrike: false,
  canStrike: false,
  isCode: false,
  canCode: false,
  canClearMarks: false,
  isParagraph: false,
  isHeading1: false,
  isHeading2: false,
  isHeading3: false,
  isHeading4: false,
  isHeading5: false,
  isHeading6: false,
  isBulletList: false,
  isOrderedList: false,
  isCodeBlock: false,
  isBlockquote: false,
  canUndo: false,
  canRedo: false,
  isLink: false,
};

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

export const editorBarState = atom(null, "editorBarState").pipe(
  withAssign((_, name) => ({
    isTable: atom(false, `${name}.isTable`),
    isLink: atom(false, `${name}.isLink`)
  }))
)

export const editorBar = atom(null, "bar").pipe(
  withAssign((_, name) => ({
    toggleLink: action((ctx) => editorBarState.isLink(ctx, (state) => !state), `${name}.toggleLink`),
    toggleTable: action((ctx) => editorBarState.isTable(ctx, (state) => !state), `${name}.toggleTable`),
    addImage: action((ctx, editor: Editor) => {
      const url = window.prompt('URL')
      if (!url) return;
      editor.chain().focus().setImage({ src: url }).run()
    }),
    setLink: action((ctx, editor: Editor) => {
      const previousUrl = editor.getAttributes('link').href
      const url = window.prompt('URL', previousUrl)
      if (url === null) return;

      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        return
      }

      try {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      } catch (e) {
        if (e instanceof Error) alert(e.message)
      }
    })
  }))
)

export const editorSelectors = (editor: EditorStateSnapshot<Editor>["editor"]) => {
  if (!editor || editor.isDestroyed) {
    return DEFAULT_SELECTORS;
  }

  return {
    isBold: editor.isActive('bold') ?? false,
    canBold: editor.can().chain().toggleBold().run() ?? false,
    isItalic: editor.isActive('italic') ?? false,
    canItalic: editor.can().chain().toggleItalic().run() ?? false,
    isStrike: editor.isActive('strike') ?? false,
    canStrike: editor.can().chain().toggleStrike().run() ?? false,
    isCode: editor.isActive('code') ?? false,
    canCode: editor.can().chain().toggleCode().run() ?? false,
    canClearMarks: editor.can().chain().unsetAllMarks().run() ?? false,
    isParagraph: editor.isActive('paragraph') ?? false,
    isHeading1: editor.isActive('heading', { level: 1 }) ?? false,
    isHeading2: editor.isActive('heading', { level: 2 }) ?? false,
    isHeading3: editor.isActive('heading', { level: 3 }) ?? false,
    isHeading4: editor.isActive('heading', { level: 4 }) ?? false,
    isHeading5: editor.isActive('heading', { level: 5 }) ?? false,
    isHeading6: editor.isActive('heading', { level: 6 }) ?? false,
    isBulletList: editor.isActive('bulletList') ?? false,
    isOrderedList: editor.isActive('orderedList') ?? false,
    isCodeBlock: editor.isActive('codeBlock') ?? false,
    isBlockquote: editor.isActive('blockquote') ?? false,
    canUndo: editor.can().chain().undo().run() ?? false,
    canRedo: editor.can().chain().redo().run() ?? false,
    isLink: editor.isActive('link'),
  }
}

export const EDITOR_DEFAULT_CONTENT = `<h2>Контент</h2>`;

export const editorState = atom(null, "editorState").pipe(
  withAssign((_, name) => ({
    content: atom(EDITOR_DEFAULT_CONTENT, `${name}.content`)
  }))
)
