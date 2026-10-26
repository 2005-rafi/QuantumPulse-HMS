import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from '../services/api';
import { adminAPI } from '../services/adminAPI';
import { auditAPI } from '../services/auditAPI';
import Md3NavigationRail from '../components/md3/Md3NavigationRail';
import Md3ClinicalDrawer from '../components/md3/Md3ClinicalDrawer';
import CommonHeader from '../components/shell/CommonHeader';
import Md3ConfirmDialog from '../components/md3/Md3ConfirmDialog';
import './Dashboard.css';

const AdministratorDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stats, setStats] = useState({ patientIn: 0, patientOut: 0, pendingLab: 0, pendingPharmacy: 0 });
  const [departments, setDepartments] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Billing Template Settings
  const [billingSettings, setBillingSettings] = useState({
    hospitalInfo: { name: '', address: '', contact: '' },
    labels: { title: '', date: '', billNo: '', patientName: '', mrn: '', ageGender: '', doctor: '', description: '', quantity: '', amount: '', consultationFee: '', labCharges: '', totalAmount: '', pharmacistSignature: '', hospitalSeal: '', footerNote: '' }
  });

  // Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    icon: '',
    loading: false,
    onConfirm: null,
  });

  const openConfirm = useCallback((opts) => setConfirmDialog((d) => ({ ...d, isOpen: true, loading: false, ...opts })), []);
  const closeConfirm = useCallback(() => setConfirmDialog((d) => ({ ...d, isOpen: false, loading: false, onConfirm: null })), []);
  const setConfirmLoading = useCallback((v) => setConfirmDialog((d) => ({ ...d, loading: v })), []);

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const inFlightStatsRef = useRef(false);
  const inFlightStaffRef = useRef(false);
  const inFlightDeptsRef = useRef(false);
  const inFlightLabsRef = useRef(false);
  const inFlightRolesRef = useRef(false);
  const inFlightAuditsRef = useRef(false);
  const inFlightBillingRef = useRef(false);

  const fetchStats = useCallback(async (isBackground = false) => {
    if (inFlightStatsRef.current) return;
    inFlightStatsRef.current = true;
    if (!isBackground) setIsRefreshingStats(true);
    try {
      const res = await api.get('/visits/stats');
      setStats(res.data.data || { patientIn: 0, patientOut: 0, pendingLab: 0, pendingPharmacy: 0 });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      inFlightStatsRef.current = false;
      if (!isBackground) setIsRefreshingStats(false);
    }
  }, []);

  const fetchDepts = useCallback(async () => {
    if (inFlightDeptsRef.current) return;
    inFlightDeptsRef.current = true;
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      inFlightDeptsRef.current = false;
    }
  }, []);

  const fetchLabs = useCallback(async () => {
    if (inFlightLabsRef.current) return;
    inFlightLabsRef.current = true;
    try {
      const res = await api.get('/laboratory/config?includeInactive=true');
      setLaboratories(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch laboratories:', err);
    } finally {
      inFlightLabsRef.current = false;
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    if (inFlightRolesRef.current) return;
    inFlightRolesRef.current = true;
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    } finally {
      inFlightRolesRef.current = false;
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    if (inFlightStaffRef.current) return;
    inFlightStaffRef.current = true;
    try {
      const res = await api.get('/staff?limit=1000');
      setStaffList(res.data.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      inFlightStaffRef.current = false;
    }
  }, []);

  const fetchBilling = useCallback(async () => {
    if (inFlightBillingRef.current) return;
    inFlightBillingRef.current = true;
    try {
      const res = await adminAPI.getSetting('billing_template');
      if (res.data.data) {
        setBillingSettings(res.data.data);
      } else {
        setBillingSettings({
          hospitalInfo: {
            name: 'GLOBAL HEALTH HOSPITAL',
            address: '123 Medical Center Blvd, City, Country',
            contact: 'Phone: +1 234 567 890 | Email: billing@globalhealth.com'
          },
          labels: {
            title: 'OFFICIAL MEDICAL BILL', date: 'Date', billNo: 'Bill No', patientName: 'Patient Name',
            mrn: 'MRN', ageGender: 'Age / Gender', doctor: 'Consulting Doctor', description: 'Description',
            quantity: 'Qty', amount: 'Amount', consultationFee: 'Doctor Consultation Fee', labCharges: 'Laboratory Charges',
            totalAmount: 'TOTAL AMOUNT DUE', pharmacistSignature: 'Pharmacist Signature', hospitalSeal: 'Authorized Hospital Seal', footerNote: 'Thank you for your visit. Wishing you a speedy recovery!'
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch billing template:', err);
    } finally {
      inFlightBillingRef.current = false;
    }
  }, []);

  const fetchRecentAudits = useCallback(async () => {
    if (inFlightAuditsRef.current) return;
    inFlightAuditsRef.current = true;
    try {
      const res = await auditAPI.getLogs({ page: 1, limit: 5 });
      setRecentAuditLogs(res.data.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch recent audit logs:', err);
    } finally {
      inFlightAuditsRef.current = false;
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchStats(),
      fetchDepts(),
      fetchLabs(),
      fetchRoles(),
      fetchStaff(),
      fetchBilling(),
      fetchRecentAudits()
    ]);
    setLoading(false);
  }, [fetchStats, fetchDepts, fetchLabs, fetchRoles, fetchStaff, fetchBilling, fetchRecentAudits]);

  useEffect(() => {
    fetchData();

    let interval = null;
    const startPolling = () => {
      if (!interval) {
        interval = setInterval(() => {
          fetchStats(true);
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchStats(true);
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchData, fetchStats]);

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  // Determine active tab from URL path
  // Path format: /dashboard/administrator/analytics
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[pathParts.length - 1] || 'analytics';

  const isDevMode = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true';

  const NAV_ITEMS = useMemo(() => [
    { id: 'analytics', icon: 'analytics', label: 'Analytics' },
    { id: 'surgeries', icon: 'medical_services', label: 'Surgeries & OT' },
    { id: 'billing', icon: 'payments', label: 'Billing & Finance' },
    { id: 'bed-map', icon: 'single_bed', label: 'Bed Map & Facility' },
    { id: 'census', icon: 'inventory', label: 'Inpatient Census & Records' },
    { id: 'patients', icon: 'groups', label: 'Patients' },
    { id: 'appointments', icon: 'calendar_month', label: 'Appointments' },
    { id: 'staff', icon: 'badge', label: 'Manage Staff' },
    { id: 'departments', icon: 'corporate_fare', label: 'Departments' },
    { id: 'laboratories', icon: 'science', label: 'Laboratories' },
    { id: 'storage', icon: 'cloud_sync', label: 'Storage & Files' },
    { id: 'audit', icon: 'history', label: 'Audit Logs' },
    ...(isDevMode ? [{ id: 'development', icon: 'developer_mode_tv', label: 'DEVELOPMENT' }] : [])
  ], [isDevMode]);

  const outletContextValue = useMemo(() => ({
    stats,
    lastUpdated,
    isRefreshingStats,
    departments,
    laboratories,
    roles,
    staffList,
    recentAuditLogs,
    billingSettings,
    setBillingSettings,
    fetchData,
    fetchStats,
    fetchDepts,
    fetchLabs,
    fetchRoles,
    fetchStaff,
    fetchBilling,
    fetchRecentAudits,
    openConfirm,
    closeConfirm,
    setConfirmLoading,
    showSuccess,
    showError,
  }), [
    stats,
    lastUpdated,
    isRefreshingStats,
    departments,
    laboratories,
    roles,
    staffList,
    recentAuditLogs,
    billingSettings,
    fetchData,
    fetchStats,
    fetchDepts,
    fetchLabs,
    fetchRoles,
    fetchStaff,
    fetchBilling,
    fetchRecentAudits,
    openConfirm,
    closeConfirm,
    setConfirmLoading,
    showSuccess,
    showError,
  ]);

  const drawerActivities = useMemo(() => [
    {
      icon: 'groups',
      label: "Today's Patient Visits",
      value: (stats.patientIn || 0) + (stats.patientOut || 0),
      variant: 'primary'
    },
    {
      icon: 'badge',
      label: 'Active Staff On-Duty',
      value: staffList.filter(s => s.status === 'ACTIVE').length || staffList.length || 0,
      variant: 'success'
    },
    {
      icon: 'biotech',
      label: 'Pending Lab Orders',
      value: stats.pendingLab || 0,
      variant: 'warning'
    },
    {
      icon: 'prescriptions',
      label: 'Pending Rx Fulfillments',
      value: stats.pendingPharmacy || 0,
      variant: 'info'
    }
  ], [stats, staffList]);

  return (
    <div className="dashboard-page admin-dashboard-page">
      <CommonHeader 
        brandTitle={`${config.SHORT_NAME || 'Quantum CareOne'} Portal`}
        brandSubtitle="Hospital Administration"
        user={user}
        onLogout={handleLogout}
        onMenuClick={() => setIsDrawerOpen(true)}
      />

      <div className="admin-body-container">
        <Md3NavigationRail 
          items={NAV_ITEMS}
          activeItem={activeTab === 'administrator' ? 'analytics' : activeTab}
          onSelect={(id) => {
            React.startTransition(() => {
              navigate(`/dashboard/administrator/${id}`);
            });
          }}
        />

        <main className="dashboard-main admin-dashboard-main">
          <div key={activeTab} className="admin-tab-content-fade">
            <Outlet context={outletContextValue} />
          </div>
        </main>
      </div>

      <Md3ClinicalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        brandTitle={`${config.SHORT_NAME || 'Quantum CareOne'} Portal`}
        brandSubtitle="Hospital Administration"
        navItems={NAV_ITEMS}
        activeTab={activeTab === 'administrator' ? 'analytics' : activeTab}
        onNavigate={(id) => {
          React.startTransition(() => {
            navigate(`/dashboard/administrator/${id}`);
          });
          setIsDrawerOpen(false);
        }}
        user={user}
        onLogout={handleLogout}
      />

      <Md3ConfirmDialog
        {...confirmDialog}
        onClose={closeConfirm}
      />
    </div>
  );
};

export default AdministratorDashboard;

