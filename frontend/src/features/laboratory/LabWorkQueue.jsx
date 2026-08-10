import React, { useMemo } from 'react';
import {
  Md3Card,
  Md3CardHeader,
  Md3Avatar,
  Md3Chip,
  Md3Divider,
  Md3EmptyState,
  Icon,
  Md3IconButton,
} from '../../components/md3/Md3Widgets';
import PatientCard from '../../components/patients/PatientCard';
import './LabWorkQueue.css';

const urgencyFor = (createdAt) => {
  if (!createdAt) return { variant: 'default', label: 'New' };
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins >= 90) return { variant: 'error', label: `${Math.floor(mins / 60)}h ${mins % 60}m` };
  if (mins >= 45) return { variant: 'warning', label: `${mins}m` };
  return { variant: 'default', label: mins > 0 ? `${mins}m` : 'Now' };
};

const priorityChip = (p) => {
  const key = (p || 'ROUTINE').toUpperCase();
  if (key === 'STAT') return { variant: 'error', label: 'STAT', icon: <Icon.Flag /> };
  if (key === 'URGENT') return { variant: 'warning', label: 'URGENT', icon: <Icon.Alert /> };
  return { variant: 'default', label: 'ROUTINE', icon: <Icon.Activity /> };
};

const QueueItemCard = ({ visit, selected, onSelect }) => {
  const patient = visit?.patientId || {};
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Unknown';
  const initials = ((patient.firstName?.charAt?.(0) || '') + (patient.lastName?.charAt?.(0) || '')).toUpperCase() || 'P';
  const orders = visit?.labOrders || [];
  const pending = orders.filter((o) => (o.status || '').toUpperCase() !== 'COMPLETED');
  const completed = orders.length - pending.length;
  const highest = pending.reduce((acc, o) => {
    const rank = { STAT: 3, URGENT: 2, ROUTINE: 1 };
    const r = rank[(o.priority || 'ROUTINE').toUpperCase()] || 1;
    return r > acc.rank ? { rank: r, priority: (o.priority || 'ROUTINE').toUpperCase() } : acc;
  }, { rank: 0, priority: 'ROUTINE' });
  const wait = urgencyFor(visit.createdAt);
  const prio = priorityChip(highest.priority);
  const ageGender = [
    patient.age ? `${patient.age} yrs` : null,
    patient.gender,
  ].filter(Boolean).join(' • ');
  const handleClick = () => onSelect && onSelect(visit);
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <PatientCard
      patient={patient}
      isSelected={selected}
      onClick={handleClick}
      typeIndicator={prio.label}
      statusBadge={wait.label}
      metadata={[
        { icon: <Icon.FileText size={14} />, text: `${orders.length} tests` },
        pending.length > 0 && { icon: <Icon.Alert size={14} />, text: `${pending.length} pending` }
      ].filter(Boolean)}
    />
  );
};

const LabWorkQueue = ({
  visits,
  selectedVisitId,
  onSelectVisit,
  onRefresh,
  loading,
  priorityBar,
  searchValue,
  onSearchChange,
  error,
  isRefreshing,
  className = '',
  style,
}) => {
  const visible = useMemo(() => {
    if (!Array.isArray(visits)) return [];
    if (!searchValue) return visits;
    const key = String(searchValue).toLowerCase();
    return visits.filter((v) => {
      const p = v?.patientId || {};
      return (
        [p.firstName, p.lastName, p.mrn, v.reasonForVisit]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(key)
      );
    });
  }, [visits, searchValue]);

  return (
    <div className={`lwq ${className}`.trim()} style={style}>
      <Md3Card variant="elevated" padding="none" className="lwq__card">
        <Md3CardHeader
          title="Laboratory Queue"
          icon={<Icon.Microscope />}
          variant="tertiary"
          headerAction={
            onRefresh ? (
              <Md3IconButton
                variant="tonal"
                size="medium"
                icon={<Icon.Refresh />}
                onClick={onRefresh}
                ariaLabel="Refresh laboratory queue"
                disabled={Boolean(isRefreshing)}
                className={isRefreshing ? 'lwq__refresh--spinning' : ''}
              />
            ) : null
          }
        />
        {priorityBar ? (
          <>
            <Md3Divider />
            <div className="lwq__priority">{priorityBar}</div>
          </>
        ) : null}
        <div className="lwq__search">
          <div className="lwq__search-icon" aria-hidden><Icon.Search /></div>
          <input
            type="search"
            className="lwq__search-input"
            placeholder="Search by patient name, MRN, reason…"
            value={searchValue || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            aria-label="Search laboratory queue"
          />
        </div>
        <Md3Divider />
        <div className="lwq__body" aria-label="Laboratory patient queue list">
          {loading ? (
            <div className="lwq__spinner" aria-label="Loading queue">
              <span className="lwq__spinner-ring" />
              <span className="lwq__spinner-text">Loading laboratory queue…</span>
            </div>
          ) : error ? (
            <Md3EmptyState
              icon={<Icon.Alert />}
              title="Unable to load the queue"
              subtitle={error}
              actionLabel="Retry"
              onAction={onRefresh}
            />
          ) : visible.length === 0 ? (
            <Md3EmptyState
              icon={<Icon.Microscope />}
              title="No patients in the laboratory queue"
              subtitle="Completed or discharged patients appear in the Reported tab."
            />
          ) : (
            <div className="lwq__list">
              {visible.map((v) => (
                <QueueItemCard
                  key={v._id || v.id}
                  visit={v}
                  selected={Boolean(selectedVisitId && (v._id || v.id) === selectedVisitId)}
                  onSelect={onSelectVisit}
                />
              ))}
            </div>
          )}
        </div>
      </Md3Card>
    </div>
  );
};

export default LabWorkQueue;
