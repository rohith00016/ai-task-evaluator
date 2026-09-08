import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IconArrowRight, 
  IconSearch, 
  IconCompass, 
  IconCheck, 
  IconPlus, 
  IconTrash, 
  IconBookOpen,
  IconEdit 
} from '../components/Icons';

export default function LearnerBrowseView({ 
  mode = 'learner', // 'learner' | 'admin'
  projects = [], 
  submissions = [], 
  onSelectProject,
  onOpenCreateModal,
  onDeleteProject,
  onViewProjectSubmissions,
  onEditProjectPRD,
  selectedCourse: propSelectedCourse,
  onSelectCourse
}) {
  const navigate = useNavigate();
  const isAdmin = mode === 'admin';
  const handleSelect = onSelectProject || ((proj) => navigate(`/learner/projects/${proj.id || proj._id}`));

  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedCourse, setLocalSelectedCourse] = useState('All');
  const selectedCourse = propSelectedCourse !== undefined ? propSelectedCourse : localSelectedCourse;
  const handleCourseChange = onSelectCourse || setLocalSelectedCourse;

  const courses = ['All', 'MERN', 'JFSD'];

  const getCourseBadgeStyle = (course) => {
    if (course === 'MERN') {
      return {
        backgroundColor: '#eff6ff',
        color: '#1d4ed8',
        border: '1px solid #dbeafe'
      };
    }
    if (course === 'JFSD') {
      return {
        backgroundColor: '#fff7ed',
        color: '#c2410c',
        border: '1px solid #ffedd5'
      };
    }
    return {
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: '1px solid #e2e8f0'
    };
  };

  const filteredProjects = projects.filter((proj) => {
    const matchesSearch = 
      proj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.description && proj.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const projCourse = proj.course || proj.category || 'MERN';
    const matchesCourse = selectedCourse === 'All' || projCourse === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const title = isAdmin ? 'Evaluation Projects' : 'Browse Projects';
  const description = isAdmin
    ? 'Create and maintain evaluation benchmarks. Generate and format rich PRD documentation with Gemini AI.'
    : 'Choose a capstone assignment, inspect technical requirements, and submit your GitHub repository for automated AI grading.';

  return (
    <div>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>{title}</h1>
          <p className="dashboard-description">{description}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Course Track Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {courses.map((course) => (
            <button
              key={course}
              type="button"
              className={`btn btn-sm ${selectedCourse === course ? 'btn-dark' : 'btn-secondary'}`}
              onClick={() => handleCourseChange(course)}
              style={{ fontSize: '0.8125rem', fontWeight: 700 }}
            >
              {course === 'All' ? 'All Courses' : `${course} Track`}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
            <IconSearch size={15} />
          </span>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '32px', fontSize: '0.84rem' }}
            placeholder={isAdmin ? 'Search benchmarks...' : 'Search projects by keyword...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="projects-grid">
        {filteredProjects.map((proj) => {
          const projSubmissions = submissions.filter((s) => s.projectId === (proj.id || proj._id));
          const latestSubmission = projSubmissions.length > 0 ? projSubmissions[projSubmissions.length - 1] : null;
          const reqCount = proj.requirementsCount || proj.requirements?.length || 0;
          const critCount = proj.evaluationCriteriaCount || proj.criteria?.length || 0;
          const courseName = proj.course || proj.category || 'MERN';

          return (
            <div key={proj.id || proj._id} className="project-card">
              <div className="project-card-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span 
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      ...getCourseBadgeStyle(courseName)
                    }}
                  >
                    {courseName} Track
                  </span>

                  {isAdmin ? (
                    onDeleteProject && (
                      <button
                        type="button"
                        title="Delete project"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete "${proj.title}"?`)) {
                            onDeleteProject(proj.id || proj._id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-light)',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                      >
                        <IconTrash size={15} />
                      </button>
                    )
                  ) : (
                    latestSubmission && (
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#f8fafc',
                          color: 'var(--color-text-main)',
                          border: '1px solid var(--color-border)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <IconCheck size={12} style={{ color: 'var(--color-success)' }} />
                        Evaluated ({latestSubmission.score}/100)
                      </span>
                    )
                  )}
                </div>

                <h3 className="project-card-title">{proj.title}</h3>
                <p className="project-card-desc">
                  {proj.description || 'Complete PRD documentation and deliverables specified.'}
                </p>
              </div>

              <div>
                <div className="project-specs">
                  <div className="spec-row">
                    <span className="spec-label">Course:</span>
                    <span className="spec-val" style={{ color: 'var(--color-text-main)', fontWeight: 700 }}>
                      {courseName} Track
                    </span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">Deliverables:</span>
                    <span className="spec-val">{reqCount} tasks</span>
                  </div>
                  {isAdmin ? (
                    <>
                      <div className="spec-row">
                        <span className="spec-label">PRD Documentation:</span>
                        <span className="spec-val" style={{ color: 'var(--color-text-main)', fontWeight: 700 }}>
                          {proj.documentation ? '✓ Available' : 'Draft'}
                        </span>
                      </div>
                      <div className="spec-row">
                        <span className="spec-label">Student Submissions:</span>
                        <span className="spec-val">{projSubmissions.length}</span>
                      </div>
                    </>
                  ) : (
                    <div className="spec-row">
                      <span className="spec-label">Evaluation criteria:</span>
                      <span className="spec-val">{critCount} rules</span>
                    </div>
                  )}
                </div>

                <div className="project-card-footer">
                  {isAdmin ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {projSubmissions.length > 0 && onViewProjectSubmissions && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onViewProjectSubmissions(proj)}
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                        >
                          <span>Submissions ({projSubmissions.length})</span>
                        </button>
                      )}
                      {onEditProjectPRD && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditProjectPRD(proj)}
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                          title="Edit project details, deliverables, and evaluation criteria"
                        >
                          <IconEdit size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div />
                  )}

                  <button
                    type="button"
                    className="view-project-link"
                    onClick={() => handleSelect(proj)}
                  >
                    <span>View</span>
                    <IconArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <IconCompass size={24} />
          </div>
          <h3>No projects found</h3>
          <p>
            {searchTerm 
              ? `No projects matching "${searchTerm}". Try a different keyword or course filter.`
              : `There are no evaluation benchmarks currently configured for the ${selectedCourse} course track.`}
          </p>
        </div>
      )}
    </div>
  );
}
