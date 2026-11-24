// pdfkit 0.21 mengekspor font standar sebagai subpath; @types belum menyediakannya.
declare module "pdfkit" {
  export function registerStdFonts(...fontData: unknown[]): void;
}

declare module "pdfkit/standard-fonts/*" {
  const font: unknown;
  export default font;
}
