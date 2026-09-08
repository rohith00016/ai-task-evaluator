import LearnerBrowseView from './LearnerBrowseView';

/**
 * AdminProjectsView reuses the unified LearnerBrowseView in 'admin' mode.
 * Provides identical spacious layout, live search, course filters, and administrative actions.
 */
export default function AdminProjectsView(props) {
  return <LearnerBrowseView mode="admin" {...props} />;
}
