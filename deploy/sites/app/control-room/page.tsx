import { ControlRoom } from "../../src/admin/ControlRoom";
export const dynamic = "force-dynamic";
// Data is fetched through the API with server-side identity + operator allowlist.
export default function Page() {
  return <ControlRoom />;
}
