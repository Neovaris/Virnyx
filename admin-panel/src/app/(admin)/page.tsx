import { fetchMe } from "@/lib/auth";

export default async function AdminHome() {
  const me = await fetchMe();

  return (
    <div style={{ padding: 16 }}>
      <h1>Admin Dashboard</h1>
      <pre style={{ background: "#111", color: "#0f0", padding: 12 }}>
        {JSON.stringify(me, null, 2)}
      </pre>
    </div>
  );
}