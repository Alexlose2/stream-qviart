import { StreamApp } from "@/components/StreamApp";
import { env, getAllowedEmails } from "@/lib/config";

export default function Home() {
  return (
    <StreamApp
      allowedEmails={getAllowedEmails()}
      streamKind={env.NEXT_PUBLIC_STREAM_KIND}
      streamUrl={env.NEXT_PUBLIC_STREAM_URL}
    />
  );
}
