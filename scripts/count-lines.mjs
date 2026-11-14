#!/usr/bin/env node
/**
 * Counts the lines of code in the tracked sources and writes `lines.json` in the
 * shields.io endpoint format. Meant for CI: `.github/workflows/lines.yml` publishes the
 * file to the `badges` branch, the README badge reads it from there.
 *
 * Generated files (openapi types, paraglide output, lockfiles) are skipped on purpose.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const SOURCE = /\.(ts|tsx|mjs|cjs|js|jsx|css)$/;
const GENERATED = /(^|\/)(gen|paraglide|node_modules|\.next|dist|\.out)\/|\.gen\.|\.d\.ts$|(bun|pnpm)-lock/;

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => SOURCE.test(file) && !GENERATED.test(file));

let total = 0;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  total += content.length ? content.split('\n').length - (content.endsWith('\n') ? 1 : 0) : 0;
}

const message = total.toLocaleString('en-US');

fs.writeFileSync(
  'lines.json',
  `${JSON.stringify(
    {
      schemaVersion: 1,
      label: 'lines',
      message,
      color: 'c78aff',
    },
    null,
    2,
  )}\n`,
);

console.log(`${message} lines in ${files.length} files`);
