import ClientProfile from "./ClientProfile";

export async function generateStaticParams() {
  return [{ id: "temp" }];
}

export default function Page() {
  return <ClientProfile />;
}
