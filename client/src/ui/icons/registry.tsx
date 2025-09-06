import type { ComponentType, SVGProps } from "react";

// импортим все SVG как React-компоненты
import Add from "../../assets/image/icons/add-icon.svg?react";
import Alignment from "../../assets/image/icons/alignment-icon.svg?react";
import Briefcase from "../../assets/image/icons/briefcase-icon.svg?react";
import Calendar from "../../assets/image/icons/calendar-icon.svg?react";
import Chat from "../../assets/image/icons/chat-icon.svg?react";
import Check from "../../assets/image/icons/check-icon.svg?react";
import CheckFilled from "../../assets/image/icons/check-filled-icon.svg?react";
import Checklist from "../../assets/image/icons/checklist-icon.svg?react";
import CirclePlus from "../../assets/image/icons/circle-plus-icon.svg?react";
import Contacts from "../../assets/image/icons/contacts-icon.svg?react";
import EventCalendar from "../../assets/image/icons/event-calendar-icon.svg?react";
import Filter from "../../assets/image/icons/filter-icon.svg?react";
import Kanban from "../../assets/image/icons/kanban-icon.svg?react";
import List from "../../assets/image/icons/list-icon.svg?react";
import More from "../../assets/image/icons/more-icon.svg?react";
import Notification from "../../assets/image/icons/notification-icon.svg?react";
import NotificationIdent from "../../assets/image/icons/notification-ident-icon.svg?react";
import Plus from "../../assets/image/icons/plus-icon.svg?react";
import Profile from "../../assets/image/icons/profile-icon.svg?react";
import Search from "../../assets/image/icons/search-icon.svg?react";
import Settings from "../../assets/image/icons/settings-icon.svg?react";
import Stats from "../../assets/image/icons/stats-icon.svg?react";
import Status from "../../assets/image/icons/status-icon.svg?react";
import User from "../../assets/image/icons/user-icon.svg?react";
import Close from "../../assets/image/icons/close-icon.svg?react";

export const iconRegistry = {
	add: Add,
	alignment: Alignment,
	briefcase: Briefcase,
	calendar: Calendar,
	chat: Chat,
	check: Check,
	checkFilled: CheckFilled,
	checklist: Checklist,
	circlePlus: CirclePlus,
	contacts: Contacts,
	eventCalendar: EventCalendar,
	filter: Filter,
	kanban: Kanban,
	list: List,
	more: More,
	notification: Notification,
	notificationIdent: NotificationIdent,
	plus: Plus,
	profile: Profile,
	search: Search,
	settings: Settings,
	stats: Stats,
	status: Status,
	user: User,
	close: Close,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

export type IconName = keyof typeof iconRegistry;
