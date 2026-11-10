import { randomBytes } from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";
import { canManageTeam, isAssignableRole } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { tenantUrl } from "@/lib/auth/tenant-redirect";
import { sendEmail } from "@/lib/email/resend";
import { renderInviteEmail } from "@/lib/email/templates/invite";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function assertCanManage(ctx: TenantContext) {
  if (!canManageTeam(ctx.role)) {
    throw new Error("Only the workspace owner can manage the team");
  }
}

export async function inviteMember(
  ctx: TenantContext,
  input: { email: string; role: Role }
) {
  assertCanManage(ctx);

  const email = input.email.trim().toLowerCase();
  if (!isAssignableRole(input.role)) {
    throw new Error("Cannot invite someone as OWNER");
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      tenantId: ctx.tenantId,
      status: "ACTIVE",
      user: { email },
    },
  });
  if (existingMembership) {
    throw new Error("This person is already a member");
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const invitation = await prisma.invitation.upsert({
    where: {
      tenantId_email: { tenantId: ctx.tenantId, email },
    },
    create: {
      tenantId: ctx.tenantId,
      email,
      role: input.role,
      token,
      invitedBy: ctx.userId,
      expiresAt,
      acceptedAt: null,
    },
    update: {
      role: input.role,
      token,
      invitedBy: ctx.userId,
      expiresAt,
      acceptedAt: null,
    },
    include: { tenant: true },
  });

  // Tenant host so the session cookie can be host-only on localhost.
  const acceptUrl = tenantUrl(invitation.tenant.slug, `/invite/${invitation.token}`);
  const { subject, html } = renderInviteEmail({
    workspaceName: invitation.tenant.name,
    inviterEmail: ctx.email,
    role: invitation.role,
    acceptUrl,
  });

  await sendEmail({
    to: email,
    subject,
    html,
    originalPurpose: "invite",
  });

  return invitation;
}

export async function updateMemberRole(
  ctx: TenantContext,
  membershipId: string,
  role: Role
) {
  assertCanManage(ctx);

  if (!isAssignableRole(role)) {
    throw new Error("Cannot assign OWNER via role change");
  }

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
  });
  if (!membership) throw new Error("Member not found");
  if (membership.role === Role.OWNER) {
    throw new Error("Cannot change the owner's role");
  }
  if (membership.userId === ctx.userId) {
    throw new Error("Cannot change your own role");
  }

  return prisma.membership.update({
    where: { id: membership.id },
    data: { role },
  });
}

export async function revokeInvitation(ctx: TenantContext, invitationId: string) {
  assertCanManage(ctx);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, tenantId: ctx.tenantId, acceptedAt: null },
  });
  if (!invitation) throw new Error("Invitation not found");

  await prisma.invitation.delete({ where: { id: invitation.id } });
  return { ok: true };
}

export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });
  if (!invitation || invitation.acceptedAt) return null;
  if (invitation.expiresAt.getTime() < Date.now()) return null;
  return invitation;
}

export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
}) {
  const invitation = await getInvitationByToken(input.token);
  if (!invitation) throw new Error("Invitation is invalid or expired");

  const passwordHash = await hashPassword(input.password);
  const email = invitation.email;

  const { user, tenantSlug } = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            passwordHash,
            emailVerified: existing.emailVerified ?? new Date(),
          },
        })
      : await tx.user.create({
          data: {
            email,
            name: input.name,
            passwordHash,
            emailVerified: new Date(),
          },
        });

    await tx.membership.upsert({
      where: {
        userId_tenantId: { userId: user.id, tenantId: invitation.tenantId },
      },
      create: {
        userId: user.id,
        tenantId: invitation.tenantId,
        role: invitation.role,
        status: "ACTIVE",
      },
      update: {
        role: invitation.role,
        status: "ACTIVE",
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return { user, tenantSlug: invitation.tenant.slug };
  });

  return {
    user,
    tenantId: invitation.tenantId,
    redirectTo: tenantUrl(tenantSlug),
  };
}
