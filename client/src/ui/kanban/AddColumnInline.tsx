import { useState } from "react";
import { createColumn, type Column } from "../../api";

export default function AddColumnInline({
	boardId,
	onCreated,
}: {
	boardId: string;
	onCreated: (c: Column) => void;
}) {
	const [title, setTitle] = useState("");
	async function submit() {
		const name = title.trim();
		if (!name) return;
		const col = await createColumn({ boardId, title: name, position: 100000 });
		onCreated(col);
		setTitle("");
	}
	return (
		<div className='w-[320px]'>
			<input
				className='w-full rounded border px-2 py-1 text-sm'
				value={title}
				onChange={e => setTitle(e.target.value)}
				placeholder='Новая колонка'
				onKeyDown={e => {
					if (e.key === "Enter") submit();
				}}
			/>
		</div>
	);
}
