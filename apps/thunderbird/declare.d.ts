import "@repo/shared/declare.d.ts"

declare global {
  // ...
}

declare module "*.txt";
declare module "*.db";
declare module "*.png";
declare module "*.jpg";

export {};
