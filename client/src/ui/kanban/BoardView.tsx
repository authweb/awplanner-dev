// client/src/ui/kanban/BoardView.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import ColumnCard from "./ColumnCard";
import TaskModal from "./TaskModal";
import BoardActionsRail from "./BoardActionsRail";
import {
	type BoardPayload,
	type Task,
	fetchTasksFiltered,
	updateColumn,
	updateTask,
} from "../../api";
import {
	keepPreviousData,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { BoardFilters } from "../../hooks/useBoardFilters";

type Props = {
	payload: BoardPayload;
	projectId: string;
	filters: BoardFilters;
	onAddColumn?: () => void;
	onCreateSummary?: () => void;
	onCreateMirror?: () => void;
};

function calcNewPosition(prev?: number, next?: number): number {
	if (prev != null && next != null) return (prev + next) / 2;
	if (prev == null && next != null) return next - 1;
	if (prev != null && next == null) return prev + 1;
	return 1000;
}

const EMPTY: Task[] = [];

export default function BoardView({
	payload,
	projectId,
	filters,
	onAddColumn,
	onCreateSummary,
	onCreateMirror,
}: Props) {
	const [columns, setColumns] = useState(() => [...payload.columns]);
	const [modalTask, setModalTask] = useState<Task | null>(null);
	const qc = useQueryClient();

	// ---- запросы
	const allKey = useMemo(
		() => ["tasks", "all", payload.board.id] as const,
		[payload.board.id],
	);

	// стабилизируем строки отдельно
	const prioKey = useMemo(
		() => (filters.priorities ?? []).join(","),
		[filters.priorities],
	);
	const tagsKey = useMemo(
		() => (filters.tagIds ?? []).join(","),
		[filters.tagIds],
	);

	const keyFilters = useMemo(
		() => ({
			q: filters.q || "",
			prio: prioKey,
			df: filters.dueFrom || "",
			dt: filters.dueTo || "",
			tags: tagsKey,
			mode: filters.tagMode || "or",
		}),
		[
			filters.q,
			prioKey,
			filters.dueFrom,
			filters.dueTo,
			tagsKey,
			filters.tagMode,
		],
	);

	const filteredKey = useMemo(
		() => ["tasks", "filtered", payload.board.id, keyFilters] as const,
		[payload.board.id, keyFilters],
	);

	const { data: allTasks = EMPTY } = useQuery<Task[]>({
		queryKey: allKey,
		queryFn: () => fetchTasksFiltered({ boardId: payload.board.id }),
		staleTime: 10_000,
	});

	const { data: filteredTasks = allTasks } = useQuery<Task[]>({
		queryKey: filteredKey,
		queryFn: () =>
			fetchTasksFiltered({
				boardId: payload.board.id,
				q: filters.q,
				priorities: filters.priorities,
				dueFrom: filters.dueFrom,
				dueTo: filters.dueTo,
				tagIds: filters.tagIds,
				tagMode: filters.tagMode,
			}),
		placeholderData: keepPreviousData,
		staleTime: 10_000,
	});

	// ---- локальный список для оптимистичных перестановок
	const [tasksUI, setTasksUI] = useState<Task[]>(filteredTasks);
	const sig = (list: Task[]) =>
		list
			.map(t => `${t.id}|${t.column_id}|${t.position}|${t.updated_at ?? ""}`)
			.join("~");
	const sigRef = useRef(sig(filteredTasks));

	useEffect(() => {
		const next = sig(filteredTasks);
		if (sigRef.current !== next) {
			setTasksUI(filteredTasks);
			sigRef.current = next;
		}
	}, [filteredTasks]);

	// ---- карты задач
	const tasksByColAll = useMemo(() => {
		const m: Record<string, Task[]> = {};
		for (const t of allTasks) (m[t.column_id] ||= []).push(t);
		for (const k in m) m[k].sort((a, b) => a.position - b.position);
		return m;
	}, [allTasks]);

	const tasksByColUI = useMemo(() => {
		const m: Record<string, Task[]> = {};
		for (const t of tasksUI) (m[t.column_id] ||= []).push(t);
		for (const k in m) m[k].sort((a, b) => a.position - b.position);
		return m;
	}, [tasksUI]);

	const columnsSorted = useMemo(
		() => [...columns].sort((a, b) => a.position - b.position),
		[columns],
	);

	// ---- DnD
	const onDragEnd = async (e: DragEndEvent) => {
		// колонки
		if (
			(e.active.data.current as { type?: string } | undefined)?.type ===
			"column"
		) {
			if (!e.over) return;
			const activeId = String(e.active.id);
			const overId = String(e.over.id);

			const ordered = [...columnsSorted];
			const from = ordered.findIndex(c => c.id === activeId);
			const to = ordered.findIndex(c => c.id === overId);
			if (from === -1 || to === -1 || from === to) return;

			const prevPos = ordered[to - 1]?.position;
			const nextPos = ordered[to]?.position;
			const newPos = calcNewPosition(prevPos, nextPos);

			const updated = { ...ordered[from], position: newPos };
			const nextCols = [...ordered];
			nextCols.splice(from, 1);
			nextCols.splice(to, 0, updated);
			setColumns(nextCols);

			await updateColumn(activeId, { position: newPos });
			return;
		}

		// задачи
		if (!e.over) return;
		const taskId = String(e.active.id);
		const fromColId = (
			e.active.data.current as { columnId?: string } | undefined
		)?.columnId;
		const toColId = (e.over.data.current as { columnId?: string } | undefined)
			?.columnId;
		if (!fromColId || !toColId) return;

		const overId = String(e.over.id);

		setTasksUI(prev => {
			const moved = prev.find(t => t.id === taskId);
			if (!moved) return prev;

			const next = prev.filter(t => t.id !== taskId);
			const list = next
				.filter(t => t.column_id === toColId)
				.sort((a, b) => a.position - b.position);
			let newIndex = list.findIndex(t => t.id === overId);
			if (newIndex === -1) newIndex = list.length;

			const prevPos = list[newIndex - 1]?.position;
			const nextPos = list[newIndex]?.position;
			const newPos = calcNewPosition(prevPos, nextPos);

			next.push({ ...moved, column_id: toColId, position: newPos });
			return next;
		});

		const overList = tasksByColUI[toColId] || [];
		let overIdx = overList.findIndex(t => t.id === overId);
		if (overIdx === -1) overIdx = overList.length;
		const prevPos = overList[overIdx - 1]?.position;
		const nextPos = overList[overIdx]?.position;
		const newPos = calcNewPosition(prevPos, nextPos);
		await updateTask(taskId, { columnId: toColId, position: newPos });

		qc.invalidateQueries({ queryKey: allKey });
		qc.invalidateQueries({ queryKey: ["tasks", "filtered", payload.board.id] });
	};

	return (
		<>
			<div className='flex gap-6 pt-4'>
				<div className='min-w-0 flex-1 overflow-x-auto px-6'>
					<DndContext onDragEnd={onDragEnd}>
						<div className='grid auto-cols-[320px] grid-flow-col max-w-screen gap-4 pb-6'>
							<SortableContext
								items={columnsSorted.map(c => c.id)}
								strategy={verticalListSortingStrategy}>
								{columnsSorted.map(col => (
									<ColumnCard
										key={col.id}
										column={col}
										tasks={tasksByColUI[col.id] ?? EMPTY}
										projectId={projectId}
										boardId={payload.board.id}
										createdBy={"0a53610f-364b-4200-b87c-9552b723c720"}
										setTasks={setTasksUI}
										onOpen={setModalTask}
										totalCount={(tasksByColAll[col.id] || EMPTY).length}
									/>
								))}
							</SortableContext>
							<aside className='sticky top-24 w-[260px] shrink-0'>
								<BoardActionsRail
									onAddColumn={onAddColumn}
									onCreateSummary={onCreateSummary}
									onCreateMirror={onCreateMirror}
								/>
							</aside>
						</div>
					</DndContext>
				</div>
			</div>

			{modalTask && (
				<TaskModal
					open
					onClose={() => setModalTask(null)}
					task={modalTask}
					projectId={projectId}
					onUpdated={updated => {
						qc.setQueryData<Task[]>(allKey, (prev = []) =>
							prev.map(t => (t.id === updated.id ? { ...t, ...updated } : t)),
						);
						qc.invalidateQueries({
							queryKey: ["tasks", "filtered", payload.board.id],
						});
						setModalTask(updated);
					}}
				/>
			)}
		</>
	);
}
