// client/src/ui/kanban/ColumnCard.tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDroppable } from "@dnd-kit/core";
import {
	useSortable,
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal } from "lucide-react";
import TaskCard from "./TaskCard";
import AddTaskInline from "./AddTaskInline";
import { Modal, Input, Button, IconButton, Dropdown } from "../primitives";
import {
	updateColumn,
	type BoardPayload,
	type Column,
	type Task,
	type Tag,
} from "../../api";

type Props = {
	column: Column;
	tasks: Task[];
	projectId: string;
	boardId: string;
	createdBy: string;
	setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
	onOpen?: (t: Task) => void;
	totalCount?: number;
	getTags?: (taskId: string) => Promise<Tag[]>;
};

const COLOR_SWATCH = [
	"#94a3b8",
	"#60a5fa",
	"#34d399",
	"#f59e0b",
	"#ef4444",
	"#a78bfa",
	"#f43f5e",
	"#10b981",
	"#22d3ee",
];

export default function ColumnCard({
	column,
	tasks,
	projectId,
	boardId,
	createdBy,
	setTasks,
	onOpen,
	totalCount,
}: Props) {
	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		transform,
		transition,
	} = useSortable({
		id: column.id,
		data: { type: "column" as const },
	});
	const style = {
		transition,
		...(transform ? { transform: CSS.Transform.toString(transform) } : {}),
	};

	const { setNodeRef: setDropRef } = useDroppable({
		id: `drop-${column.id}`,
		data: { columnId: column.id },
	});

	const [menuOpen, setMenuOpen] = useState(false);
	const [showRename, setShowRename] = useState(false);
	const [newTitle, setNewTitle] = useState(column.title);
	const [showColor, setShowColor] = useState(false);

	const doRename = () => {
		if (!newTitle.trim()) return;
		// здесь может быть вызов API updateColumn(...)
		setShowRename(false);
	};

	const qc = useQueryClient();

	const setColor = async (color: string | null) => {
		setShowColor(false);

		// оптимистично красим колонку в кэше доски
		qc.setQueryData<BoardPayload | undefined>(["board", projectId], old =>
			old
				? {
						...old,
						columns: old.columns.map((c: Column) =>
							c.id === column.id ? { ...c, color } : c,
						),
				  }
				: old,
		);

		try {
			await updateColumn(column.id, { color });
		} catch {
			// если упало — просто рефрешим данные доски
			qc.invalidateQueries({ queryKey: ["board", projectId] });
		}
	};

	const doDelete = () => {
		if (!confirm("Удалить колонку?")) return;
		setMenuOpen(false);
		// оптимистично чистим задачи этой колонки
		setTasks(prev => prev.filter(t => t.column_id !== column.id));
		// вызов API deleteColumn(...) — на твоей стороне
	};

	return (
		<div ref={setDragRef} style={style} className='w-[320px]'>
			<div className='rounded-2xl border border-border bg-panel p-3 shadow-sm'>
				{/* header */}
				<div
					className='mb-2 flex items-center justify-between'
					{...attributes}
					{...listeners}>
					<div className='flex items-center gap-2'>
						{column.color && (
							<span
								className='h-2 w-2 rounded-full'
								style={{ backgroundColor: column.color }}
							/>
						)}
						<div className='font-medium'>{column.title}</div>
						<span className='text-xs text-muted'>
							{tasks.length}
							{typeof totalCount === "number" && <> / {totalCount}</>}
						</span>
					</div>
					<div className='relative'>
						<IconButton onClick={() => setMenuOpen(true)}>
							<MoreHorizontal size={16} />
						</IconButton>
						<Dropdown
							open={menuOpen}
							onClose={() => setMenuOpen(false)}
							menuClass='right-0'>
							<button
								className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5'
								onClick={() => {
									setMenuOpen(false);
									setShowRename(true);
								}}>
								Переименовать
							</button>
							<button
								className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5'
								onClick={() => {
									setMenuOpen(false);
									setShowColor(true);
								}}>
								Цвет метки
							</button>
							<button
								className='w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-black/5'
								onClick={doDelete}>
								Удалить колонку
							</button>
						</Dropdown>
					</div>
				</div>

				{/* list */}
				<div ref={setDropRef} className='min-h-[8px] space-y-2'>
					<SortableContext
						items={tasks.map(t => t.id)}
						strategy={verticalListSortingStrategy}>
						{tasks.map(t => (
							<TaskCard
								key={t.id}
								task={t}
								columnId={column.id}
								onOpen={onOpen}
							/>
						))}
					</SortableContext>
				</div>

				{/* add task */}
				<div className='mt-3'>
					<AddTaskInline
						projectId={projectId}
						boardId={boardId}
						columnId={column.id}
						createdBy={createdBy}
						onCreated={t => setTasks(prev => [...prev, t])}
					/>
				</div>
			</div>

			{/* rename */}
			<Modal
				open={showRename}
				onClose={() => setShowRename(false)}
				title='Переименовать колонку'>
				<div className='space-y-3'>
					<Input
						value={newTitle}
						onChange={e => setNewTitle(e.target.value)}
						autoFocus
					/>
					<div className='flex justify-end gap-2'>
						<Button variant='secondary' onClick={() => setShowRename(false)}>
							Отмена
						</Button>
						<Button onClick={doRename} disabled={!newTitle.trim()}>
							Сохранить
						</Button>
					</div>
				</div>
			</Modal>

			{/* color */}
			<Modal
				open={showColor}
				onClose={() => setShowColor(false)}
				title='Цвет метки'>
				<div className='grid grid-cols-9 gap-2 p-1'>
					{COLOR_SWATCH.map(c => (
						<button
							key={c}
							onClick={() => setColor(c)}
							className='h-7 w-7 rounded-full border border-border'
							style={{ backgroundColor: c }}
							title={c}
						/>
					))}
					<button
						onClick={() => setColor(null)}
						className='col-span-3 rounded-xl border border-border px-2 py-1 text-sm'>
						Без цвета
					</button>
				</div>
			</Modal>
		</div>
	);
}
