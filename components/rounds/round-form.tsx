"use client";

import { useActionState, useMemo, useState } from "react";
import { closestCenter, DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { createRoundAction, type RoundFormState, updateRoundAction } from "@/actions/rounds";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/icons";

type ParticipantOption = {
  sessionParticipantId: string;
  playerDisplayName: string;
  isActive: boolean;
};

type RoundFormDefaults = {
  orderedSessionParticipantIds: string[];
  notes?: string | null;
};

type RoundFormProps =
  | {
      mode: "create";
      gameSessionId: string;
      groupId: string | null;
      participantOptions: ParticipantOption[];
      defaultValues?: RoundFormDefaults;
    }
  | {
      mode: "edit";
      gameSessionId: string;
      roundId: string;
      groupId: string | null;
      participantOptions: ParticipantOption[];
      defaultValues: RoundFormDefaults;
    };

type OrderItemProps = {
  participant: ParticipantOption;
  index: number;
  total: number;
  moveBy: (participantId: string, direction: -1 | 1) => void;
};

function buildInitialOrder(participants: ParticipantOption[], defaults?: RoundFormDefaults) {
  const participantIds = new Set(participants.map((participant) => participant.sessionParticipantId));
  const defaultIds = defaults?.orderedSessionParticipantIds.filter((id) => participantIds.has(id)) ?? [];
  const missingIds = participants
    .map((participant) => participant.sessionParticipantId)
    .filter((id) => !defaultIds.includes(id));

  return [...defaultIds, ...missingIds];
}

function moveItem(ids: string[], activeId: string, overId: string) {
  const fromIndex = ids.indexOf(activeId);
  const toIndex = ids.indexOf(overId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return ids;
  }

  const nextIds = ids.slice();
  const [movedId] = nextIds.splice(fromIndex, 1);
  nextIds.splice(toIndex, 0, movedId);
  return nextIds;
}

function OrderItem({ participant, index, total, moveBy }: OrderItemProps) {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
    id: participant.sessionParticipantId,
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: participant.sessionParticipantId,
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  };

  return (
    <li
      ref={(node) => {
        setDraggableRef(node);
        setDroppableRef(node);
      }}
      style={style}
      className={`app-card-muted flex items-center gap-3 px-3 py-3 text-sm transition ${
        isDragging ? "opacity-60 shadow-sm" : ""
      } ${isOver ? "border-[color:color-mix(in_srgb,var(--accent)_45%,var(--border))]" : ""}`}
      data-testid={`round-order-item-${index + 1}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)]">
        {index + 1}
      </span>
      <button
        type="button"
        className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
        aria-label={`Drag ${participant.playerDisplayName}`}
        {...attributes}
        {...listeners}
      >
        <span className="block truncate font-medium text-[var(--text-primary)]">{participant.playerDisplayName}</span>
        {!participant.isActive ? <span className="text-xs text-[var(--text-muted)]">Inactive</span> : null}
      </button>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          className="app-button app-button-ghost app-icon-button"
          disabled={index === 0}
          onClick={() => moveBy(participant.sessionParticipantId, -1)}
        >
          <ArrowUpIcon />
          <span className="sr-only">Move {participant.playerDisplayName} up</span>
        </button>
        <button
          type="button"
          className="app-button app-button-ghost app-icon-button"
          disabled={index === total - 1}
          onClick={() => moveBy(participant.sessionParticipantId, 1)}
        >
          <ArrowDownIcon />
          <span className="sr-only">Move {participant.playerDisplayName} down</span>
        </button>
      </div>
    </li>
  );
}

export function RoundForm(props: RoundFormProps) {
  const action =
    props.mode === "edit"
      ? updateRoundAction.bind(null, props.gameSessionId, props.roundId, props.groupId)
      : createRoundAction.bind(null, props.gameSessionId, props.groupId);

  const initialState: RoundFormState = {};
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [orderedIds, setOrderedIds] = useState(() => buildInitialOrder(props.participantOptions, props.defaultValues));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const participantsById = useMemo(
    () => new Map(props.participantOptions.map((participant) => [participant.sessionParticipantId, participant])),
    [props.participantOptions],
  );
  const orderedParticipants = orderedIds
    .map((id) => participantsById.get(id))
    .filter((participant): participant is ParticipantOption => Boolean(participant));
  const participantCount = orderedParticipants.length;

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : "";

    if (!overId) {
      return;
    }

    setOrderedIds((currentIds) => moveItem(currentIds, activeId, overId));
  }

  function moveBy(participantId: string, direction: -1 | 1) {
    setOrderedIds((currentIds) => {
      const currentIndex = currentIds.indexOf(participantId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentIds.length) {
        return currentIds;
      }

      const nextIds = currentIds.slice();
      [nextIds[currentIndex], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[currentIndex]];
      return nextIds;
    });
  }

  return (
    <form action={formAction} className="app-card space-y-5 p-5 md:p-6" data-testid="round-form">
      <div>
        <h2 className="app-section-title">Finishing order</h2>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <ol className="space-y-2" data-testid="round-order-list">
          {orderedParticipants.map((participant, index) => (
            <OrderItem
              key={participant.sessionParticipantId}
              participant={participant}
              index={index}
              total={participantCount}
              moveBy={moveBy}
            />
          ))}
        </ol>
      </DndContext>

      {orderedIds.map((participantId) => (
        <input key={participantId} type="hidden" name="orderedSessionParticipantIds" value={participantId} />
      ))}

      {state.fieldErrors?.orderedSessionParticipantIds ? (
        <p className="text-sm text-[var(--danger)]">{state.fieldErrors.orderedSessionParticipantIds}</p>
      ) : null}

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={1000}
          defaultValue={props.defaultValues?.notes ?? ""}
          rows={4}
          className="app-textarea"
        />
        {state.fieldErrors?.notes ? <p className="mt-1 text-sm text-[var(--danger)]">{state.fieldErrors.notes}</p> : null}
      </div>

      {state.message ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || participantCount < 2}
        data-testid="round-submit-button"
        className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : props.mode === "edit" ? "Save round" : "Add round"}
      </button>
    </form>
  );
}
