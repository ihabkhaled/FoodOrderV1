declare module '@/modules/data-access' {
  /**
   * Temporary compile-only declaration for the unreferenced first-pass session
   * view-model. The production command-center hook imports createId from
   * `@/shared/helpers`. Remove this declaration together with the superseded
   * hook before v1.7.0 release validation.
   */
  export function createId(prefix?: string): string;
}

export {};
