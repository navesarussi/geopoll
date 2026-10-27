/** Last-resort error UI: a JS error shows a readable screen (screenshot-able for bug reports) instead of a hard crash. */
import { Component, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { report } from "./native/sentry";

export function FatalScreen({ error }: { error: unknown }) {
  const msg = error instanceof Error ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}` : String(error);
  return (
    <View style={{ flex: 1, padding: 24, paddingTop: 72, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>משהו השתבש · Something went wrong</Text>
      <Text style={{ marginBottom: 12 }}>צלמו מסך ושלחו לצוות · Please screenshot this and send it to the team.</Text>
      <ScrollView><Text selectable style={{ fontFamily: "Menlo", fontSize: 11 }}>{msg.slice(0, 4000)}</Text></ScrollView>
    </View>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidCatch(error: unknown) { console.error("ErrorBoundary", error); report(error); }
  render() { return this.state.error ? <FatalScreen error={this.state.error} /> : this.props.children; }
}
