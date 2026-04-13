import { z } from "zod";

const lobbyCodeRegex = /^[A-HJ-NP-Z2-9]{6}$/;

const idSchema = z.string().trim().min(1).max(64);

export const createLobbySchema = z.object({});

export const joinLobbySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(lobbyCodeRegex, "Enter a valid 6-character lobby code."),
});

export const readyStateSchema = z.object({
  lobbyId: idSchema,
  ready: z.boolean(),
});

export const lobbyIdSchema = z.object({
  lobbyId: idSchema,
});

export const swapCardsSchema = z.object({
  lobbyId: idSchema,
  handCardIds: z.array(z.string().min(2).max(8)).length(3),
  faceUpCardIds: z.array(z.string().min(2).max(8)).length(3),
});

export const onlineMoveSchema = z.object({
  lobbyId: idSchema,
  move: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("play"),
      cardIds: z.array(z.string().min(2).max(8)).min(1).max(4),
    }),
    z.object({
      type: z.literal("pickup"),
    }),
    z.object({
      type: z.literal("blind_play"),
    }),
    z.object({
      type: z.literal("face_up_pickup"),
      cardId: z.string().min(2).max(8),
    }),
  ]),
});

export type JoinLobbyInput = z.infer<typeof joinLobbySchema>;
export type OnlineMoveInput = z.infer<typeof onlineMoveSchema>;
