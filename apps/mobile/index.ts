import { createElement } from "react";
import { registerRootComponent } from "expo";
import { ErrorBoundary, FatalScreen } from "./src/Fatal";

// Load the app lazily so a throw while evaluating modules (native module missing, bad config, crypto init)
// renders a readable error screen instead of a fatal launch crash.
let Root: () => ReturnType<typeof createElement>;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const App = require("./App").default;
  Root = () => createElement(ErrorBoundary, null, createElement(App));
} catch (error) {
  console.error("App failed to load", error);
  Root = () => createElement(FatalScreen, { error });
}
registerRootComponent(Root);
