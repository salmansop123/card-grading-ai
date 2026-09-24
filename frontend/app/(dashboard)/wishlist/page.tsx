import { redirect } from "next/navigation";

export default function WishlistRedirect() {
  redirect("/vault?tab=wishlist");
}
