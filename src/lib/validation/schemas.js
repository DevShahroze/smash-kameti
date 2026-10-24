import { z } from "zod";
import {
  PAYMENT_SYSTEMS,
  OUTING_STATUS,
  TURN_STATUS,
  ATTENDANCE_STATUS,
  ACCOUNTING_MODES,
  TRANSACTION_TYPES,
} from "@/lib/constants";

export const memberSchema = z.object({
  fullName: z.string().min(1).max(120),
  nickname: z.string().max(60).optional().default(""),
  contact: z.string().max(120).optional().default(""),
  active: z.boolean().optional().default(true),
  kametiTurnNumber: z.number().int().positive().nullable().optional(),
});

export const guestSchema = z.object({
  name: z.string().min(1).max(120),
  notes: z.string().max(500).optional().default(""),
});

export const venueSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional().default(""),
  notes: z.string().max(500).optional().default(""),
});

const participantRefSchema = z.object({
  kind: z.enum(["member", "guest"]),
  refId: z.string().min(1),
  nameSnapshot: z.string().min(1),
});

const parcelSchema = z.object({
  orderedBy: participantRefSchema,
  amountPaisa: z.number().int().min(0),
  paidBy: participantRefSchema,
  notes: z.string().optional().default(""),
});

const paymentSchema = z.object({
  paidBy: participantRefSchema,
  amountPaisa: z.number().int().min(0),
  appliesTo: z.string().optional().default("shared"),
  paymentMethod: z.string().optional().default(""),
});

export const outingSchema = z.object({
  weekNumber: z.number().int().min(1),
  scheduledDate: z.string().nullable().optional(),
  actualDate: z.string().nullable().optional(),
  venueId: z.string().nullable().optional(),
  venueNameSnapshot: z.string().optional().default(""),
  paymentSystem: z.enum([PAYMENT_SYSTEMS.KAMETI, PAYMENT_SYSTEMS.AMERICAN]),
  status: z
    .enum([
      OUTING_STATUS.PLANNED,
      OUTING_STATUS.POSTPONED,
      OUTING_STATUS.COMPLETED,
      OUTING_STATUS.CANCELLED,
    ])
    .optional()
    .default(OUTING_STATUS.PLANNED),
  kametiTurnId: z.string().nullable().optional(),
  hostMemberId: z.string().nullable().optional(),
  hostMemberNameSnapshot: z.string().optional().default(""),
  sharedBillPaisa: z.number().int().min(0).optional().default(0),
  additionalExpensesPaisa: z.number().int().min(0).optional().default(0),
  parcels: z.array(parcelSchema).optional().default([]),
  payments: z.array(paymentSchema).optional().default([]),
  chargeableParticipants: z.array(participantRefSchema).optional().default([]),
  attendance: z
    .array(
      z.object({
        memberId: z.string(),
        memberNameSnapshot: z.string(),
        status: z.enum([
          ATTENDANCE_STATUS.PRESENT,
          ATTENDANCE_STATUS.ABSENT,
          ATTENDANCE_STATUS.NOT_RECORDED,
        ]),
      }),
    )
    .optional()
    .default([]),
  guests: z
    .array(
      z.object({
        guestId: z.string().nullable().optional(),
        nameSnapshot: z.string(),
        attended: z.boolean().optional().default(true),
        chargeableAmerican: z.boolean().optional().default(false),
      }),
    )
    .optional()
    .default([]),
  notes: z.string().optional().default(""),
  settlementsIncluded: z.boolean().optional().default(true),
});

export const transferSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amountPaisa: z.number().int().positive(),
  transactionDate: z.string().datetime().optional(),
  notes: z.string().optional().default(""),
  paymentMethod: z.string().optional().default(""),
});

export const adjustmentSchema = z.object({
  memberId: z.string().min(1),
  amountPaisa: z.number().int(),
  type: z.enum([TRANSACTION_TYPES.ADJUSTMENT, TRANSACTION_TYPES.REFUND]),
  transactionDate: z.string().datetime().optional(),
  notes: z.string().min(1),
});

export const settingsSchema = z.object({
  accountingMode: z
    .enum([ACCOUNTING_MODES.EXPENSE_BASED, ACCOUNTING_MODES.COMBINED])
    .optional(),
  groupName: z.string().max(120).optional(),
  currency: z.string().max(10).optional(),
});

const pastKametiTurnSchema = z.object({
  memberId: z.string().min(1),
  treatAmountPaisa: z.number().int().min(0).optional().default(0),
  completedAt: z.string().nullable().optional(),
  notes: z.string().optional().default(""),
});

export const rotationPatchSchema = z.object({
  active: z.boolean().optional(),
  settlementsIncluded: z.boolean().optional(),
});

export const rotationCreateSchema = z.object({
  label: z.string().optional().default(""),
  startDate: z.string().nullable().optional(),
  memberIds: z.array(z.string()).min(1),
  notes: z.string().optional().default(""),
  /** Turns already completed before using the app (same members as in memberIds). */
  pastTurns: z.array(pastKametiTurnSchema).optional().default([]),
});

export const turnUpdateSchema = z.object({
  memberId: z.string().optional(),
  status: z
    .enum([TURN_STATUS.PENDING, TURN_STATUS.COMPLETED, TURN_STATUS.CANCELLED])
    .optional(),
  outingId: z.string().nullable().optional(),
  treatAmountPaisa: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const turnReorderSchema = z.object({
  turns: z.array(
    z.object({
      turnId: z.string(),
      turnNumber: z.number().int().min(1),
      memberId: z.string().optional(),
    }),
  ),
});
