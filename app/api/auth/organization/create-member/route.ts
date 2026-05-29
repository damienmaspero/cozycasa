import { handleCreateOrganizationMember } from "@/src/organization-members.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleCreateOrganizationMember(request);
}
