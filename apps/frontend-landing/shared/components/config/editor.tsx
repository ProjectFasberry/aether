import StarterKit from "@tiptap/starter-kit"
import { TextStyleKit } from "@tiptap/extension-text-style"
import Image from '@tiptap/extension-image'
import { TableKit } from "@tiptap/extension-table";
import { Dropcursor } from "@tiptap/extensions";
import { MAIN_DOMAIN } from "@/shared/env";

const ALLOWED_DOMAINS = [
  'google.com',
  'github.com',
  'stackoverflow.com',
  'wikipedia.org',
  'mozilla.org',
  'apple.com',
  'amazon.com',
  'linkedin.com',
  MAIN_DOMAIN,
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
  }),
]
