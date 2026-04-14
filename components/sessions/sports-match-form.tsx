"use client";

import { useActionState } from "react";

import { createSportsMatchAction, type SportsMatchFormState, updateSportsMatchAction } from "@/actions/matches";
import { Field, FormSection } from "@/components/ui/form-primitives";

type ParticipantOption = {
  sessionParticipantId: string;
  playerDisplayName: string;
  isActive: boolean;
};

type PadelSetInput = {
  sideOneGames: number;
  sideTwoGames: number;
};

type SportsMatchFormDefaults = {
  sideOneSessionParticipantIds?: string[];
  sideTwoSessionParticipantIds?: string[];
  squashScoreSideOne?: number;
  squashScoreSideTwo?: number;
  padelSets?: PadelSetInput[];
  notes?: string | null;
};

type SportsMatchFormProps =
  | {
      mode: "create";
      gameSessionId: string;
      activityType: "SQUASH" | "PADEL";
      participantOptions: ParticipantOption[];
      defaultValues?: SportsMatchFormDefaults;
    }
  | {
      mode: "edit";
      gameSessionId: string;
      matchId: string;
      activityType: "SQUASH" | "PADEL";
      participantOptions: ParticipantOption[];
      defaultValues: SportsMatchFormDefaults;
    };

function getPadelSetDefaultValue(
  sets: PadelSetInput[] | undefined,
  index: number,
  side: "sideOneGames" | "sideTwoGames",
): string {
  const set = sets?.[index];

  if (!set) {
    return "";
  }

  return String(set[side]);
}

export function SportsMatchForm(props: SportsMatchFormProps) {
  const action =
    props.mode === "edit"
      ? updateSportsMatchAction.bind(null, props.gameSessionId, props.matchId, props.activityType)
      : createSportsMatchAction.bind(null, props.gameSessionId, props.activityType);

  const initialState: SportsMatchFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);

  const defaults = props.defaultValues;
  const firstFour = props.participantOptions.slice(0, 4).map((option) => option.sessionParticipantId);

  const sideOneIds =
    defaults?.sideOneSessionParticipantIds ??
    (props.activityType === "SQUASH" ? [firstFour[0] ?? ""] : [firstFour[0] ?? "", firstFour[1] ?? ""]);

  const sideTwoIds =
    defaults?.sideTwoSessionParticipantIds ??
    (props.activityType === "SQUASH" ? [firstFour[1] ?? ""] : [firstFour[2] ?? "", firstFour[3] ?? ""]);

  return (
    <form action={formAction} className="app-card space-y-5 p-6">
      <FormSection
        title={props.activityType === "SQUASH" ? "Players" : "Teams"}
        description={
          props.activityType === "SQUASH"
            ? "Select exactly one participant for each side."
            : "Select two participants per side for this padel match."
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="side-one-1" label={props.activityType === "SQUASH" ? "Side 1 player" : "Side 1 player 1"}>
            <select
              id="side-one-1"
              name="sideOneSessionParticipantIds"
              defaultValue={sideOneIds[0] ?? ""}
              className="app-select"
              required
            >
              <option value="" disabled>
                Select participant
              </option>
              {props.participantOptions.map((participant) => (
                <option key={participant.sessionParticipantId} value={participant.sessionParticipantId}>
                  {participant.playerDisplayName}
                  {!participant.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </Field>

          {props.activityType === "PADEL" ? (
            <Field id="side-one-2" label="Side 1 player 2">
              <select
                id="side-one-2"
                name="sideOneSessionParticipantIds"
                defaultValue={sideOneIds[1] ?? ""}
                className="app-select"
                required
              >
                <option value="" disabled>
                  Select participant
                </option>
                {props.participantOptions.map((participant) => (
                  <option key={participant.sessionParticipantId} value={participant.sessionParticipantId}>
                    {participant.playerDisplayName}
                    {!participant.isActive ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field id="side-two-1" label={props.activityType === "SQUASH" ? "Side 2 player" : "Side 2 player 1"}>
            <select
              id="side-two-1"
              name="sideTwoSessionParticipantIds"
              defaultValue={sideTwoIds[0] ?? ""}
              className="app-select"
              required
            >
              <option value="" disabled>
                Select participant
              </option>
              {props.participantOptions.map((participant) => (
                <option key={participant.sessionParticipantId} value={participant.sessionParticipantId}>
                  {participant.playerDisplayName}
                  {!participant.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </Field>

          {props.activityType === "PADEL" ? (
            <Field id="side-two-2" label="Side 2 player 2">
              <select
                id="side-two-2"
                name="sideTwoSessionParticipantIds"
                defaultValue={sideTwoIds[1] ?? ""}
                className="app-select"
                required
              >
                <option value="" disabled>
                  Select participant
                </option>
                {props.participantOptions.map((participant) => (
                  <option key={participant.sessionParticipantId} value={participant.sessionParticipantId}>
                    {participant.playerDisplayName}
                    {!participant.isActive ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>

        {state.fieldErrors?.sideOneSessionParticipantIds || state.fieldErrors?.sideTwoSessionParticipantIds ? (
          <p className="mt-2 text-xs text-[var(--danger)]">
            {state.fieldErrors.sideOneSessionParticipantIds ?? state.fieldErrors.sideTwoSessionParticipantIds}
          </p>
        ) : null}
      </FormSection>

      {props.activityType === "SQUASH" ? (
        <FormSection title="Score" description="Enter the final squash game score.">
          <div className="grid gap-3 md:grid-cols-2">
            <Field id="squash-score-side-one" label="Side 1 score" error={state.fieldErrors?.squashScoreSideOne}>
              <input
                id="squash-score-side-one"
                name="squashScoreSideOne"
                type="number"
                min={0}
                max={99}
                defaultValue={defaults?.squashScoreSideOne ?? ""}
                className="app-input"
                required
              />
            </Field>
            <Field id="squash-score-side-two" label="Side 2 score">
              <input
                id="squash-score-side-two"
                name="squashScoreSideTwo"
                type="number"
                min={0}
                max={99}
                defaultValue={defaults?.squashScoreSideTwo ?? ""}
                className="app-input"
                required
              />
            </Field>
          </div>
        </FormSection>
      ) : (
        <FormSection title="Set scores" description="Enter tennis-style set scores. Set 3 is only needed if sets 1 and 2 are split.">
          <div className="space-y-3">
            {[1, 2, 3].map((setNumber, index) => (
              <div key={setNumber} className="grid gap-3 md:grid-cols-[auto_1fr_1fr] md:items-end">
                <p className="text-sm text-[var(--text-secondary)]">Set {setNumber}</p>
                <Field id={`padel-set-${setNumber}-side-one`} label="Side 1 games">
                  <input
                    id={`padel-set-${setNumber}-side-one`}
                    name={`padelSet${setNumber}SideOneGames`}
                    type="number"
                    min={0}
                    max={7}
                    defaultValue={getPadelSetDefaultValue(defaults?.padelSets, index, "sideOneGames")}
                    className="app-input"
                    required={setNumber <= 2}
                  />
                </Field>
                <Field id={`padel-set-${setNumber}-side-two`} label="Side 2 games">
                  <input
                    id={`padel-set-${setNumber}-side-two`}
                    name={`padelSet${setNumber}SideTwoGames`}
                    type="number"
                    min={0}
                    max={7}
                    defaultValue={getPadelSetDefaultValue(defaults?.padelSets, index, "sideTwoGames")}
                    className="app-input"
                    required={setNumber <= 2}
                  />
                </Field>
              </div>
            ))}
          </div>
          {state.fieldErrors?.padelSets ? <p className="mt-2 text-xs text-[var(--danger)]">{state.fieldErrors.padelSets}</p> : null}
        </FormSection>
      )}

      <Field id="notes" label="Notes" error={state.fieldErrors?.notes}>
        <textarea
          id="notes"
          name="notes"
          maxLength={1000}
          defaultValue={defaults?.notes ?? ""}
          rows={3}
          className="app-textarea"
          placeholder="Optional match notes"
        />
      </Field>

      {state.message ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">{state.message}</div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save match" : "Add match"}
      </button>
    </form>
  );
}
