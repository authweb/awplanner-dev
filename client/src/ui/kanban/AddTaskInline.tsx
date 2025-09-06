// client/src/ui/kanban/AddTaskInline.tsx
import { useState } from "react";
import { createTask, type Task, type CreateTaskPayload } from "../../api";

type Props = {
	projectId: string;
	boardId: string;
	columnId: string;
	createdBy: string;
	onCreated: (task: Task) => void;
};

export default function AddTaskInline({
	projectId,
	boardId,
	columnId,
	createdBy,
	onCreated,
}: Props) {
	const [title, setTitle] = useState("");

	async function submit() {
		const name = title.trim();
		if (!name) return;

		const payload: CreateTaskPayload = {
			projectId,
			boardId,
			columnId,
			title: name,
			position: 100000,
			createdBy,
		};

		const t = await createTask(payload);
		onCreated(t);
		setTitle("");
	}

	return (
		<div className='mt-2'>
			<input
				className='w-full rounded border px-2 py-1 text-sm'
				value={title}
				onChange={e => setTitle(e.target.value)}
				placeholder='Название задачи'
				onKeyDown={e => {
					if (e.key === "Enter") submit();
				}}
			/>
		</div>
	);
}
