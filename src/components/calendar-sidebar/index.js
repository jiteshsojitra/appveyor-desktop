import { h } from 'preact';
import SidebarPrimaryButton from '../sidebar-primary-button';
import Sidebar from '../sidebar';
import RefinerList from '../refiner-list';
import style from './style';
import { LeftSideAdSlot } from '../ad-slots';

export default function CalendarSidebar({
	after,
	before,
	filterItems,
	items,
	onNavigateBack,
	setDateValue,
	types,
	matchesScreenMd
}) {
	return (
		<Sidebar header={false}>
			<div class={style.sidebarWrapper}>
				{matchesScreenMd && (
					<div class={style.sidebarHeader}>
						<SidebarPrimaryButton
							textId="calendar.backToCalendar"
							onClick={onNavigateBack}
							hyperlinkStyle
						/>
					</div>
				)}
				<RefinerList
					after={after}
					before={before}
					filterItems={filterItems}
					items={items}
					setDateValue={setDateValue}
					types={types}
				/>
			</div>
			<LeftSideAdSlot />
		</Sidebar>
	);
}
