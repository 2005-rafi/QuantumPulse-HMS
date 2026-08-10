import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import api from '../services/api';
import { adminAPI } from '../services/adminAPI';
import { auditAPI } from '../services/auditAPI';
import Md3NavigationRail from '../components/md3/Md3NavigationRail';
import CommonHeader from '../components/shell/CommonHeader';
import Md3ConfirmDialog from '../components/md3/Md3ConfirmDialog';
import './Dashboard.css';

const AdministratorDashboard = () => {
  const { user, logout } = useAuth();
  const config = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

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

  const openConfirm = (opts) => setConfirmDialog({ ...confirmDialog, isOpen: true, loading: false, ...opts });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, isOpen: false, loading: false, onConfirm: null }));
  const setConfirmLoading = (v) => setConfirmDialog((d) => ({ ...d, loading: v }));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/visits/stats');
      setStats(res.data.data || { patientIn: 0, patientOut: 0, pendingLab: 0, pendingPharmacy: 0 });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchLabs = async () => {
    try {
      const res = await api.get('/laboratory/config?includeInactive=true');
      setLaboratories(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch laboratories:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/staff?limit=1000');
      setStaffList(res.data.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const fetchBilling = async () => {
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
    }
  };

  const fetchRecentAudits = async () => {
    try {
      const res = await auditAPI.getLogs({ page: 1, limit: 5 });
      setRecentAuditLogs(res.data.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch recent audit logs:', err);
    }
  };

  const fetchData = async () => {
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
  };

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

  const NAV_ITEMS = [
    { id: 'analytics', icon: 'monitoring', label: 'Analytics' },
    { id: 'patients', icon: 'groups', label: 'Patients' },
    { id: 'staff', icon: 'badge', label: 'Manage Staff' },
    { id: 'departments', icon: 'corporate_fare', label: 'Manage Departments' },
    { id: 'laboratories', icon: 'science', label: 'Manage Laboratories' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
    { id: 'audit', icon: 'history', label: 'Audit Logs' }
  ];

  return (
    <div className="dashboard-page" style={{ height: '100vh', overflow: 'hidden' }}>
      <CommonHeader 
        brandTitle={`${config.SHORT_NAME} Portal`}
        user={user}
        onLogout={handleLogout}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Md3NavigationRail 
          items={NAV_ITEMS}
          activeItem={activeTab === 'administrator' ? 'analytics' : activeTab}
          onSelect={(id) => navigate(`/dashboard/administrator/${id}`)}
        />

        <main className="dashboard-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <Outlet context={{
            stats,
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
            showError
          }} />
        </main>
      </div>

      <Md3ConfirmDialog
        {...confirmDialog}
        onClose={closeConfirm}
      />
    </div>
  );
};

export default AdministratorDashboard;
