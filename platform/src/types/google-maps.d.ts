/// <reference types="@types/google.maps" />

declare namespace google {
  namespace accounts {
    namespace id {
      function initialize(config: Record<string, unknown>): void;
      function renderButton(el: HTMLElement, config: Record<string, unknown>): void;
    }
  }
}

export {};
