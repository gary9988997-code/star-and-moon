import { redirect } from "next/navigation";

/** 站点入口：进入月光之门 */
export default function RootPage() {
  redirect("/gate");
}
