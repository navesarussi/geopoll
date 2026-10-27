import { getServerSession } from "next-auth";
import { authOptions, demoLoginEnabled, googleEnabled } from "@/lib/auth";
import VoteClient from "./VoteClient";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await getServerSession(authOptions);
  const providers = [...(googleEnabled() ? ["google"] : []), ...(demoLoginEnabled() ? ["demo"] : [])];
  return <VoteClient signedIn={!!session} providers={providers} />;
}
