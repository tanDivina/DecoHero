// Web dev server only: `?demo=<scene>` swaps the app for a fixed scene used to take store screenshots.
// In a production build Metro replaces __DEV__ with false and drops this whole block, including the
// require, so DemoApp.tsx is not in the bundle (tools/screenshots/README.md shows how to check).
import type { ComponentType } from "react";

export function demoRoot(): ComponentType | null {
  if (__DEV__) {
    if (new URLSearchParams(window.location.search).has("demo")) {
      return require("./DemoApp").DemoApp;
    }
  }
  return null;
}
