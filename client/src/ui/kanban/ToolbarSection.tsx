import type { ReactNode } from "react";
import { cn } from "../cn";

/** Белая плашка с мягкой тенью и кольцом — для групп кнопок/фильтров */
export default function ToolbarSection({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"inline-flex flex-wrap items-center gap-2 rounded-2xl border border-border",
				"bg-panel px-2 py-2 shadow-sm",
				className,
			)}>
			{children}
		</div>
	);
}
