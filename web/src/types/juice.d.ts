declare module 'juice' {
  interface JuiceOptions {
    inlinePseudoElements?: boolean
    preserveImportant?: boolean
    resolveCSSVariables?: boolean
  }

  export default function juice(html: string, options?: JuiceOptions): string
}
