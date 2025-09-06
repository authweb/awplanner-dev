// client/src/ui/kanban/TaskCard.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, Tag } from "../../api";
import TagChip from "../tags/TagChip";

function prioColor(p: number) {
	switch (p) {
		case 4:
			return "bg-red-500";
		case 3:
			return "bg-orange-500";
		case 2:
			return "bg-amber-500";
		case 1:
			return "bg-lime-500";
		default:
			return "bg-gray-400";
	}
}

function daysLeft(d?: string | null) {
	if (!d) return null;
	const today = new Date();
	const due = new Date(d);
	return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

export default function TaskCard({
	task,
	columnId,
	onOpen,
	tags = [],
}: {
	task: Task;
	columnId: string;
	onOpen?: (t: Task) => void;
	tags?: Tag[];
}) {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({
			id: task.id,
			data: { columnId },
		});

	const style = { transform: CSS.Transform.toString(transform), transition };

	const dueISO = typeof task.due_date === "string" ? task.due_date : undefined;
	const dLeft = daysLeft(dueISO ?? null);

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			onDoubleClick={() => onOpen?.(task)}
			className='group cursor-grab select-none rounded-xl border border-white/20 bg-white/90 p-3 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md'
			title='Двойной клик — редактировать'>
			<div className='flex items-start gap-2'>
				<span
					className={`mt-1 h-2 w-2 flex-none rounded-full ${prioColor(
						task.priority,
					)}`}
				/>
				<div className='min-w-0 flex-1'>
					<div className='truncate text-sm font-medium text-gray-900'>
						{task.title}
					</div>

					{task.description && (
						<div className='mt-1 line-clamp-2 text-xs text-gray-500'>
							{task.description}
						</div>
					)}

					{/* мета-строка */}
					<div className='mt-2 flex items-center gap-2 text-[11px] text-gray-600'>
						{dueISO && (
							<span
								className={`rounded-full px-2 py-0.5 ${
									dLeft !== null && dLeft <= 1
										? "bg-red-50 text-red-600"
										: "bg-gray-100"
								}`}>
								Дедлайн: {dueISO.slice(0, 10)}
							</span>
						)}
					</div>

					{/* теги отдельной строкой, как в референсе */}
					{tags.length > 0 && (
						<div className='mt-2 flex flex-wrap gap-1'>
							{tags.map(tg => (
								<TagChip key={tg.id} tag={tg} />
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
