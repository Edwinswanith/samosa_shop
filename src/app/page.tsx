import { ShopApp } from "@/components/ShopApp";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  return <ShopApp />;
}
