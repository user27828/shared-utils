export namespace DEFAULT_CALENDAR_CONFIG {
    let timezone: string;
    let timezoneName: string;
    let defaultDuration: number;
}
export default CalendarAdd;
/**
 * Adding events to various calendar services
 *
 * @param {Object} props - Component props
 * @param {Object} props.event - Event details object
 * @param {string} props.event.title - Event title
 * @param {string} props.event.description - Event description (can be HTML)
 * @param {string|Date} props.event.startDate - Event start date
 * @param {string} [props.event.location] - Event location or URL
 * @param {number} [props.event.duration] - Event duration in minutes
 * @param {string} [props.event.id] - Unique identifier for the event
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {Function} props.onAuthRequired - Callback when authentication is required
 * @param {Object} [props.calendarConfig] - Calendar configuration options
 * @param {string} [props.calendarConfig.timezone] - Timezone for the event
 * @param {string} [props.calendarConfig.timezoneName] - Human-readable timezone name
 * @param {number} [props.calendarConfig.defaultDuration] - Default duration in minutes
 * @param {Object} [props.buttonProps] - Props to pass to the Button component
 * @param {boolean} [props.iconOnly] - If true, renders only the icon without button text
 * @returns {JSX.Element}
 * @component
 */
declare function CalendarAdd({ event, requireAuth, isAuthenticated, onAuthRequired, calendarConfig, buttonProps, iconOnly, }: {
    event: {
        title: string;
        description: string;
        startDate: string | Date;
        location?: string | undefined;
        duration?: number | undefined;
        id?: string | undefined;
    };
    isAuthenticated: boolean;
    onAuthRequired: Function;
    calendarConfig?: {
        timezone?: string | undefined;
        timezoneName?: string | undefined;
        defaultDuration?: number | undefined;
    } | undefined;
    buttonProps?: Object | undefined;
    iconOnly?: boolean | undefined;
}): JSX.Element;
