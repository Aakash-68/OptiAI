import { redirect } from "next/navigation";

/** Chat is the default landing surface. */
export default function Home() {
  redirect("/chat");
}
