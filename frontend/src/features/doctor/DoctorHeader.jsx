import React from 'react';
import {
  Icon, Md3Avatar, Md3Tabs, Md3IconButton, Md3Badge, Md3Divider,
} from '../../components/md3/Md3Widgets';

const CONSULTATION_TAB = {
  id: 'consultation',
  label: 'Consultation Desk',
  icon: <Icon.Stethoscope />,
};

const DELETION_TAB = {
  id: 'deletionRequests',
  label: 'Deletion Requests',
  icon: <Icon.FileText />,
};

const DoctorHeader = ({
  user,
  activeTab,
  onTabChange,
  onLogout,
  deletionRequestCount = 0,
}) => {
  const fullName = user?.fullName || 'Unknown';
  const department = user?.department || 'Department';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const tabs = [
    CONSULTATION_TAB,
    {
      ...DELETION_TAB,
      label: deletionRequestCount > 0
        ? `${DELETION_TAB.label} (${deletionRequestCount})`
        : DELETION_TAB.label,
    },
  ];

  return (
    <header className="doctor-header">
      <div className="doctor-header__brand">
        <div className="doctor-header__brand-icon">
          <Icon.Hospital />
        </div>
        <div className="doctor-header__brand-text">
          <h1 className="doctor-header__title">Doctor Portal</h1>
          <span className="doctor-header__subtitle">{department}</span>
        </div>
      </div>

      <div className="doctor-header__tabs">
        <Md3Tabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
      </div>

      <div className="doctor-header__user">
        <div className="doctor-header__user-info">
          <Md3Avatar initials={initials} size="medium" variant="primary" />
          <div className="doctor-header__user-meta">
            <span className="doctor-header__user-name">Dr. {fullName.replace(/^Dr\.\s*/i, '')}</span>
            <span className="doctor-header__user-role">
              {user?.role ? user.role.replace(/_/g, ' ') : 'Physician'}
            </span>
          </div>
        </div>
        <Md3IconButton
          icon={<Icon.Logout />}
          onClick={onLogout}
          variant="tonal"
          size="medium"
          ariaLabel="Sign out"
        />
      </div>
    </header>
  );
};

export default DoctorHeader;
