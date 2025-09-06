import type { HTMLAttributes } from "react";
import type { Tag } from "../../api";

// контраст текста на фоне
function readableTextOn(bg: string): "white" | "black" {
	const hex = bg.replace("#", "");
	if (hex.length !== 6) return "white";
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return lum > 0.6 ? "black" : "white";
}

export default function TagChip({
	tag,
	className,
	...rest
}: { tag: Pick<Tag, "name" | "color"> } & HTMLAttributes<HTMLSpanElement>) {
	const bg = tag.color || "#9ca3af"; // fallback: gray-400
	const txt = readableTextOn(bg);
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
				className || ""
			}`}
			style={{ backgroundColor: bg, color: txt }}
			{...rest}>
			{tag.name}
		</span>
	);
}
