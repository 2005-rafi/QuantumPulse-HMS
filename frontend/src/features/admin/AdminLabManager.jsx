import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import CreateLaboratorySheet from './CreateLaboratorySheet';
import { Md3Fab, Icon } from '../../components/md3/Md3Widgets';
import { Md3TestCatalogConfigurator } from '../../components/md3/Md3TestCatalogConfigurator';
import { Md3SearchBar, Md3SegmentedFilter } from '../../components/md3/AdminControls';
import { Md3EmptyState } from '../../components/md3/Md3EmptyState';
import Md3Pagination from '../../components/md3/Md3Pagination';
import usePagination from '../../hooks/usePagination';

const AdminLabManager = () => {
  const { 
    laboratories, 
    departments, 
    fetchLabs, 
    openConfirm, 
    closeConfirm, 
    setConfirmLoading, 
    showSuccess, 
    showError 
  } = useOutletContext();

  const [isCreateLaboratoryOpen, setIsCreateLaboratoryOpen] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  
  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Both');

  // Test Catalog Configuration State
  const [configuringLab, setConfiguringLab] = useState(null);

  const displayMessage = (msg, isError = false) => {
    if (isError) {
      showError(msg);
    } else {
      showSuccess(msg);
    }
  };

  const handleDeleteLaboratory = (id, name) => {
    openConfirm({
      title: 'Delete Laboratory',
      message: `Permanently delete "${name}" laboratory? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      icon: 'delete_forever',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/laboratory/config/${id}`);
          showSuccess(`Laboratory "${name}" deleted.`);
          fetchLabs();
          closeConfirm();
        } catch (err) {
          showError(err.response?.data?.message || 'Error deleting laboratory');
          closeConfirm();
        }
      },
    });
  };

  const handleEditLabCatalog = (lab) => {
    setConfiguringLab(lab);
  };

  const handleToggleLabStatus = async (id, name, currentStatus) => {
    try {
      await api.put(`/laboratory/config/${id}`, { isActive: !currentStatus });
      displayMessage(`Laboratory "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchLabs();
    } catch (err) {
      displayMessage(err.response?.data?.message || 'Error updating status', true);
    }
  };

  const filteredLaboratories = laboratories.filter((lab) => {
    const matchesSearch = searchQuery.trim() === '' ||
      (lab.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lab.departmentId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lab.departmentId?.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'Both' ||
      (lab.departmentId?.type || 'DIAGNOSTIC') === typeFilter;
    return matchesSearch && matchesType;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedLabs,
    showTopPagination,
  } = usePagination(filteredLaboratories, 50, [searchQuery, typeFilter]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <section className="info-card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, color: 'var(--md-sys-color-primary)' }}>Hospital Laboratories</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            <Md3SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search lab or dept code..." 
            />
            <Md3SegmentedFilter
              selectedValue={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'Both', label: 'All' },
                { value: 'DIAGNOSTIC', label: 'Diagnostic' },
                { value: 'CLINICAL/DIAGNOSTIC', label: 'Clin+Diag' },
              ]}
            />
          </div>
        </div>

        {/* Top Pagination (rendered when total records exceed 20) */}
        {showTopPagination && (
          <Md3Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="laboratories"
            position="top"
          />
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="md3-data-grid md3-paginated-content-fade" key={page} style={{ flex: 1, paddingBottom: '20px' }}>
            {paginatedLabs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', width: '100%' }}>
                <Md3EmptyState
                  icon="science"
                  title="No laboratories found"
                  description="There are currently no diagnostic or clinical laboratories configured matching the search criteria or filter."
                  variant="card"
                />
              </div>
            ) : (
              filteredLaboratories.map(lab => (
                <div key={lab._id} className="md3-data-card">
                  <div className="md3-data-card-header">
                    <h3 className="md3-data-card-title" style={{ opacity: lab.isActive ? 1 : 0.65 }}>{lab.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!lab.isActive && (
                        <span className="md3-status-chip md3-card-btn-error" style={{ fontSize: '10px', padding: '2px 8px' }}>
                          INACTIVE
                        </span>
                      )}
                      <span className="md3-status-chip md3-card-btn-secondary" style={{ fontSize: '11px', padding: '3px 10px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {lab.departmentId?.code || 'LAB'}
                      </span>
                    </div>
                  </div>
                  <div className="md3-data-card-body">
                    <p style={{ margin: 0, color: 'var(--md-sys-color-on-surface-variant)', fontSize: '13px', lineHeight: '1.4' }}>
                      {lab.description || 'No description provided.'}
                    </p>
                    <div className="md3-card-meta-list" style={{ marginTop: '12px' }}>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Department</span>
                        <span className="md3-card-meta-value">{lab.departmentId?.name || '—'}</span>
                      </div>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Dept Type</span>
                        <span className="md3-status-chip md3-card-btn-secondary" style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '11px', fontWeight: 600 }}>
                          {lab.departmentId?.type || 'DIAGNOSTIC'}
                        </span>
                      </div>
                      <div className="md3-card-meta-item">
                        <span className="md3-card-meta-label">Catalog Size</span>
                        <span className="md3-card-meta-value">{(lab.testCatalog?.length || 0)} test{lab.testCatalog?.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="md3-data-card-actions">
                    <button 
                      onClick={() => setEditingLab(lab)}
                      className="md3-card-btn md3-card-btn-outlined"
                    >
                      Edit Details
                    </button>
                    <button 
                      onClick={() => handleEditLabCatalog(lab)}
                      className="md3-card-btn md3-card-btn-outlined"
                    >
                      Test Catalog
                    </button>
                    <button 
                      onClick={() => handleToggleLabStatus(lab._id, lab.name, lab.isActive)}
                      className={`md3-card-btn ${lab.isActive ? 'md3-card-btn-outlined' : 'md3-card-btn-primary'}`}
                    >
                      {lab.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDeleteLaboratory(lab._id, lab.name)}
                      className="md3-card-btn md3-card-btn-error"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Pagination */}
          {totalItems > 0 && (
            <Md3Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="laboratories"
              position="bottom"
            />
          )}
        </div>
      </section>

      <Md3Fab 
        icon={<Icon.Plus />} 
        label="Add Lab" 
        onClick={() => setIsCreateLaboratoryOpen(true)} 
        style={{ position: 'fixed', bottom: '32px', right: '32px' }} 
      />

      <CreateLaboratorySheet
        isOpen={isCreateLaboratoryOpen || !!editingLab}
        onClose={() => { setIsCreateLaboratoryOpen(false); setEditingLab(null); }}
        onSuccess={(msg) => { displayMessage(msg); fetchLabs(); setIsCreateLaboratoryOpen(false); setEditingLab(null); }}
        departments={departments}
        laboratory={editingLab}
      />

      {configuringLab && (
        <Md3TestCatalogConfigurator
          lab={configuringLab}
          onClose={() => setConfiguringLab(null)}
          onSave={async (updatedCatalog) => {
            await api.put(`/laboratory/config/${configuringLab._id}`, {
              name: configuringLab.name,
              description: configuringLab.description,
              isActive: configuringLab.isActive,
              testCatalog: updatedCatalog
            });
            displayMessage('Laboratory test catalog updated successfully');
            setConfiguringLab(null);
            fetchLabs();
          }}
        />
      )}
    </div>
  );
};

export default AdminLabManager;
